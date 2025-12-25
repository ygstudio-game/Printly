// electron/websocketClient.ts
import WebSocket from 'ws';
import { BrowserWindow, app } from 'electron';
import { LocalStore } from './localStore';
import { PrintJob } from '../types';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private backendUrl: string;
  private shopId: string;
  private printerId: string;
  private window: BrowserWindow | null;
  private localStore: LocalStore;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private isClosing = false;

  constructor(
    backendUrl: string,
    printerId: string,
    window: BrowserWindow,
    localStore: LocalStore
  ) {
    this.backendUrl = backendUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    this.printerId = printerId;
    this.window = window;
    this.localStore = localStore;
    
    this.shopId = localStore.get('shopId') as string || '';

    // ✅ Listen for app quit events
    app.on('before-quit', () => {
      this.isClosing = true;
      this.close();
    });
  }

  connect() {
    // ✅ Don't connect if closing or no shopId
    if (this.isClosing || !this.shopId) {
      if (!this.shopId) {
        console.warn('⚠️ No shopId found, cannot connect to WebSocket');
      }
      return;
    }

    try {
      // ✅ Connect with shopId AND printerId in URL
      const wsUrl = `${this.backendUrl}?shopId=${this.shopId}&printerId=${this.printerId}`;
      console.log('🔌 Connecting to:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        // ✅ Check if still valid
        if (this.isClosing || !this.window || this.window.isDestroyed()) {
          this.close();
          return;
        }

        console.log('✅ WebSocket connected to cloud');
        this.reconnectAttempts = 0;
        
        // ✅ CRITICAL: Send REGISTER message immediately after connection
        this.sendRegisterMessage();
        
        // ✅ Start heartbeat to keep connection alive
        this.startHeartbeat();
        
        this.safeSend('ws-status', 'connected');
      });

      this.ws.on('message', (data) => {
        // ✅ Check if still valid
        if (this.isClosing || !this.window || this.window.isDestroyed()) {
          return;
        }

        try {
          const message = JSON.parse(data.toString());
          console.log('📨 Received message:', message.type);

          // ✅ Handle different message types
          switch (message.type) {
            case 'REGISTERED':
              console.log('✅ Printer registered successfully with backend');
              break;

            case 'NEW_JOB':
              console.log('📥 New job received:', message.job.jobNumber);
              this.localStore.addJob(message.job);
              this.safeSend('new-job', message.job);
              break;

            case 'PONG':
              // Heartbeat response
              break;

            default:
              console.log('📨 Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      this.ws.on('close', (code, reason) => {
        console.log(`🔌 WebSocket disconnected (code: ${code}, reason: ${reason.toString()})`);
        
        // Stop heartbeat
        this.stopHeartbeat();
        
        this.safeSend('ws-status', 'disconnected');

        // ✅ Only reconnect if not closing
        if (!this.isClosing) {
          this.reconnect();
        }
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        this.safeSend('ws-status', 'error');
      });

    } catch (error) {
      console.error('❌ Connection failed:', error);
      if (!this.isClosing) {
        this.reconnect();
      }
    }
  }

  // ✅ CRITICAL: Send registration message to backend
  private sendRegisterMessage() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const registerMessage = {
      type: 'REGISTER',
      shopId: this.shopId,
      printerId: this.printerId,
      timestamp: new Date().toISOString()
    };

    console.log('📤 Sending REGISTER message:', registerMessage);

    try {
      this.ws.send(JSON.stringify(registerMessage));
      console.log('✅ REGISTER message sent');
    } catch (error) {
      console.error('❌ Failed to send REGISTER message:', error);
    }
  }

  // ✅ Keep connection alive with heartbeat
  private startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing interval

    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.isClosing) {
        try {
          this.ws.send(JSON.stringify({ type: 'PING' }));
        } catch (error) {
          console.error('Failed to send ping:', error);
        }
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // ✅ Safe send method
  private safeSend(channel: string, data: any) {
    try {
      if (!this.isClosing && this.window && !this.window.isDestroyed()) {
        this.window.webContents.send(channel, data);
      }
    } catch (error) {
      // Silent fail
    }
  }

  private reconnect() {
    // ✅ Don't reconnect if closing
    if (this.isClosing) {
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      
      // Clear existing timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }

      const delay = Math.min(5000 * this.reconnectAttempts, 30000); // Exponential backoff, max 30s
      console.log(`🔄 Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      this.reconnectTimeout = setTimeout(() => {
        if (!this.isClosing) {
          this.connect();
        }
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached. Giving up.');
      this.safeSend('ws-status', 'failed');
    }
  }

  close() {
    console.log('🛑 Closing WebSocket connection...');
    this.isClosing = true;

    // Stop heartbeat
    this.stopHeartbeat();

    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Close WebSocket
    if (this.ws) {
      try {
        // Send disconnect message before closing
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'DISCONNECT',
            shopId: this.shopId,
            printerId: this.printerId
          }));
        }

        this.ws.removeAllListeners();
        
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
        }
      } catch (error) {
        // Silent fail during cleanup
      }
      this.ws = null;
    }

    // Clear window reference
    this.window = null;
    console.log('✅ WebSocket closed');
  }

  // ✅ Reconnect with new shopId (for logout/login)
  reconnectWithShopId(shopId: string) {
    console.log('🔄 Reconnecting with new shopId:', shopId);
    
    this.shopId = shopId;
    this.isClosing = false;
    this.reconnectAttempts = 0;
    
    // Update in local store
    this.localStore.set('shopId', shopId);
    
    // Close existing connection
    if (this.ws) {
      this.ws.close();
    }
    
    // Connect with new shopId
    setTimeout(() => this.connect(), 1000);
  }

  // ✅ Get connection status
  getStatus(): 'connected' | 'disconnected' | 'connecting' {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CONNECTING:
        return 'connecting';
      default:
        return 'disconnected';
    }
  }
}
