 import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { config } from './config';
import { PrintManager } from './printManager';
import { LocalStore } from './localStore';
import { WebSocketClient } from './websocketClient';
import axios from 'axios';
import { WindowsPrinterDetector, WindowsPrinterCapabilities } from './windowsPrinterDetector'; // ✅ Import types
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import { PrintJob } from '@/types';
import { autoUpdater } from 'electron-updater'; 

let mainWindow: BrowserWindow | null = null;
let printManager: PrintManager;
let localStore: LocalStore;
let wsClient: WebSocketClient;
let windowsPrinterDetector: WindowsPrinterDetector;

// --- Auto Updater Setup ---
function setupAutoUpdater() {
  autoUpdater.logger = console;
  // Check for updates immediately on startup (production only)
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  // Poll for updates every hour
  setInterval(() => {
    if (app.isPackaged) autoUpdater.checkForUpdatesAndNotify();
  }, 60 * 60 * 1000);
}

// Update Events
autoUpdater.on('update-available', () => {
  console.log('⬇️ Update available. Downloading...');
});
autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'A new version of Printly has been downloaded. Restart now to apply?',
    buttons: ['Restart', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

app.on('ready', () => {
  console.log(`🚀 Starting Printer App: ${config.printerId}`);
  
  createWindow();
  setupAutoUpdater();
  // Initialize Modules
  localStore = new LocalStore();
  const removed = localStore.cleanupOldJobs(12); // Cleanup jobs older than 12 hours
    if (removed > 0) {
    console.log(`🧹 Cleaned up ${removed} old jobs on startup`);
  }
  printManager = new PrintManager(localStore);
  
windowsPrinterDetector = new WindowsPrinterDetector(mainWindow!, localStore); 
  wsClient = new WebSocketClient(
    config.backendUrl, 
    config.printerId, 
    mainWindow!, 
    localStore
  );

  // WebSocket Event Handlers new for fixing the vercel websocket issue these two event onwsclient on
    wsClient.on('open', () => {
    console.log('✅ Poller connected to backend');
  });

  wsClient.on('message', async (data: string) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Received message:', message.type);

      if (message.type === 'NEW_JOB') {
        const job = message.job;
        console.log('📥 New job received:', job.jobNumber);
        
        // 1. Add to local store
        localStore.addJob(job);
        
        // 2. Notify UI
        if (mainWindow) {
          mainWindow.webContents.send('new-job', job);
        }

        // 3. Optional: Auto-print if desired
        // await printManager.printJob(job);
      }
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  });
  wsClient.connect();
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (!app.isPackaged) {
     // Dev Mode: Load from Webpack Dev Server if running
     // OR load local file if you prefer manual build
     const indexPath = path.join(__dirname, '../renderer/index.html');
     mainWindow.loadFile(indexPath);
  } else {
     // Prod Mode: Load from dist
     const indexPath = path.join(__dirname, '../renderer/index.html'); // Adjust relative to dist/main/main.js
     mainWindow.loadFile(indexPath);
  }
  console.log(" UI Loaded");

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  if (mainWindow) {
  mainWindow.on('close', (event) => {
    console.log('🪟 Main window closing...');
    
    if (wsClient) {
      wsClient.close();
    }
  });
}

}

// --- IPC HANDLERS ---
ipcMain.handle('sync-jobs-from-backend', async () => {
  try {
    const shopId = localStore.get('shopId');
    const token = localStore.get('token');
    if (!shopId) {
      console.warn('⚠️ No shopId found, cannot sync jobs');
      return { success: false, jobs: [] };
    }

    const backendHttp = config.backendUrl.replace('ws', 'http');
    const apiUrl = `${backendHttp}/api/shops/${shopId}/jobs/pending`;
    
    console.log('📥 Fetching pending jobs from backend:', apiUrl);
    
  const response = await axios.get(apiUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.data.success && Array.isArray(response.data.jobs)) {
      const backendJobs = response.data.jobs;
      console.log(`✅ Fetched ${backendJobs.length} jobs from backend`);
      
      // ✅ Merge with local jobs (avoid duplicates)
      const localJobs = localStore.getPendingJobs();
      const localJobIds = new Set(localJobs.map(j => j._id));
      
      // Add new jobs from backend that aren't in local store
      let addedCount = 0;
      backendJobs.forEach((job: PrintJob)  => {
        if (!localJobIds.has(job._id)) {
          localStore.addJob(job);
          addedCount++;
        }
      });
      
      if (addedCount > 0) {
        console.log(`➕ Added ${addedCount} new jobs from backend`);
      }
      
      // Return all pending jobs (merged)
      return {
        success: true,
        jobs: localStore.getPendingJobs()
      };
    }
    
    return {
      success: false,
      jobs: localStore.getPendingJobs()
    };
  } catch (error: any) {
    console.error('❌ Failed to sync jobs from backend:', error.message);
    // Return local jobs even if sync fails
    return {
      success: false,
      error: error.message,
      jobs: localStore.getPendingJobs()
    };
  }
});
// electron/main.ts

ipcMain.handle('get-history-from-backend', async () => {
  try {
    const shopId = localStore.get('shopId');
        const token = localStore.get('token');   // get stored JWT token

    if (!shopId) {
      console.warn('⚠️ No shopId found');
      return [];
    }

    const backendHttp = config.backendUrl.replace('ws', 'http');
   const response = await axios.get(`${backendHttp}/api/shops/${shopId}/jobs/history?limit=200`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      console.log(`✅ Fetched ${response.data.jobs.length} history jobs from backend`);
      return response.data.jobs;
    }
    
    return [];
  } catch (error: any) {
    console.error('Failed to fetch history from backend:', error);
    return [];
  }
});

// Job Management
ipcMain.handle('get-pending-jobs', async (_event, syncWithBackend: boolean = false) => {
  if (syncWithBackend) {
    const result = await ipcMain.emit('sync-jobs-from-backend');
    return result;
  }
  return localStore.getPendingJobs();
});
// ✅ Handler for removing a single job
ipcMain.handle('remove-job', async (_event, jobId: string) => {
  try {
    const token = localStore.get('token');
    const backendHttp = config.backendUrl.replace('ws', 'http');

    // 1. Call Backend API
    await axios.delete(`${backendHttp}/api/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // 2. Remove from Local Store
    localStore.removeJob(jobId);
    
    console.log(`🗑️ Removed job ${jobId}`);
    return { success: true };

  } catch (error: any) {
    console.error('❌ Failed to remove job:', error.message);
    // If backend fails (e.g. 404), we might still want to remove locally? 
    // For now, only remove locally if backend succeeds to keep sync.
    return { success: false, error: error.message };
  }
});

// ✅ Handler for removing ALL jobs
ipcMain.handle('remove-all-jobs', async () => {
  try {
    const shopId = localStore.get('shopId');
    const token = localStore.get('token');
    
    if (!shopId) throw new Error('No shop ID found');

    const backendHttp = config.backendUrl.replace('ws', 'http');

    // 1. Call Backend API
    await axios.delete(`${backendHttp}/api/jobs/shop/${shopId}/all`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // 2. Clear Local Store
    localStore.clearJobs();

    console.log(`🗑️ Removed all jobs for shop ${shopId}`);
    return { success: true };

  } catch (error: any) {
    console.error('❌ Failed to remove all jobs:', error.message);
    return { success: false, error: error.message };
  }
});
ipcMain.handle('generate-print-preview', async (_event, settings: any, sourcePdfPath: string) => {
  try {
    // Create a hidden window for rendering
    const previewWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        offscreen: true
      }
    });

    // Load the PDF
    await previewWindow.loadFile(sourcePdfPath);

    // Convert margins based on preset
    const marginPresets = {
      none: { top: 0, right: 0, bottom: 0, left: 0 },
      narrow: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 },
      default: { top: 1, right: 1, bottom: 1, left: 1 },
      moderate: { top: 1, right: 0.75, bottom: 1, left: 0.75 },
      wide: { top: 1, right: 2, bottom: 1, left: 2 }
    };

    const margins = marginPresets[settings.margins as keyof typeof marginPresets] || marginPresets.default;

    // ✅ Calculate scale (convert percentage to decimal, clamp between 0.1 and 2)
    let scale = 1.0;
    if (settings.scale === 'custom') {
      // Convert percentage (e.g., 100) to decimal (e.g., 1.0)
      scale = Math.max(0.1, Math.min(2.0, settings.scalePercent / 100));
    } else if (settings.scale === 'actual') {
      scale = 1.0;
    }
    // 'fit' uses default scale of 1.0

    console.log(`📐 Scale: ${settings.scalePercent}% -> ${scale}`);

    // Generate PDF with settings
    const pdfBuffer = await previewWindow.webContents.printToPDF({
      landscape: settings.orientation === 'landscape',
      printBackground: true,
      pageSize: settings.paperSize,
      margins: {
        top: margins.top,
        bottom: margins.bottom,
        left: margins.left,
        right: margins.right
      },
      scale: scale, // ✅ Use decimal scale (0.1 - 2.0)
      pageRanges: settings.pageRanges || ''
    });

    // Save to temp file
    const tempPath = path.join(os.tmpdir(), `print-preview-${Date.now()}.pdf`);
    fs.writeFileSync(tempPath, pdfBuffer);

    // Close the hidden window
    previewWindow.close();

    console.log('✅ Preview generated:', tempPath);
    return tempPath;
  } catch (error: any) {
    console.error('Failed to generate print preview:', error);
    throw error;
  }
});
ipcMain.handle('convert-to-pdf', async (_event, filePath: string, fileType: string) => {
  try {
    // If it's already a PDF, just return the path
    if (fileType === 'pdf') {
      return filePath;
    }

    // Create temp directory for conversions
    const tempDir = path.join(os.tmpdir(), 'printly-conversions');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempPath = path.join(tempDir, `converted-${Date.now()}.pdf`);

    // For DOCX, DOC files - use mammoth for better conversion
    if (fileType === 'docx' || fileType === 'doc') {
      return await convertDocxToPdf(filePath, tempPath);
    }

    // For images - use HTML to PDF conversion
    // if (fileType === 'image') {
    //   return await convertImageToPdf(filePath, tempPath);
    // }

    throw new Error(`Unsupported file type: ${fileType}`);
  } catch (error: any) {
    console.error('Failed to convert to PDF:', error);
    throw error;
  }
});
ipcMain.handle('read-pdf-file', async (_event, filePath: string) => {
  try {
    const buffer = fs.readFileSync(filePath);
    return buffer;
  } catch (error: any) {
    console.error('Failed to read PDF:', error);
    throw error;
  }
});
ipcMain.handle('download-job-file', async (_event, job: any) => {
  try {
    // Use existing downloadFile method from PrintManager
    const pdfPath = await printManager.downloadFile(job.fileKey);
    return pdfPath;
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
});
ipcMain.handle('print-job', async (_event, job) => {
  return await printManager.printJob(job);
});

// ✅ FIXED: Get All Printers
ipcMain.handle('get-all-printers', async (_event, forceRefresh: boolean = false) => {
  const printers = await windowsPrinterDetector.getAllWindowsPrinters(forceRefresh);
  return printers;
});

// ✅ Get Default Printer (uses cache)
ipcMain.handle('get-printer-details', async () => {
  const printer = await windowsPrinterDetector.getDefaultPrinter();
  return printer;
});   

 // ✅ Get shop settings
ipcMain.handle('get-shop-settings', async (_event, shopId: string) => {
  try {
    const backendHttp = config.backendUrl.replace('ws', 'http');
    const response = await axios.get(`${backendHttp}/api/shops/settings/${shopId}`);
    return response.data;
  } catch (error: any) {
    console.error('Get settings error:', error);
    return { pricing: { bwPerPage: 5, colorPerPage: 10 } };
  }
});

// ✅ Update shop settings
ipcMain.handle('update-shop-settings', async (_event, data: any) => {
  try {
        const token = localStore.get('token');  // get JWT token from local store
const backendHttp = config.backendUrl.replace('ws', 'http');
if (!token) {
      console.warn('⚠️ No auth token found, cannot update settings');
      return { success: false, error: 'Unauthorized' };
    }

    const response = await axios.post(`${backendHttp}/api/shops/settings`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });    return response.data;
  } catch (error: any) {
    console.error('Update settings error:', error);
    return { success: false, error: error.message };
  }
});


// ✅ FIXED: Send Selected Printers to Backend
// src/main/main.ts

ipcMain.handle('send-printers-to-backend', async (_event, printerData: WindowsPrinterCapabilities[]) => {
  try {
    console.log('📥 Received printer data:', printerData.length);
    
    const shopId = localStore.get('shopId');
       const token = localStore.get('token');
 if (!shopId) {
      return { success: false, error: 'Not registered' };
    }
 if (!token) {
      console.warn('⚠️ No auth token found, cannot send printers');
      return { success: false, error: 'Unauthorized' };
    }
    const backendHttp = config.backendUrl.replace('ws', 'http');
    
    const response = await axios.post(
      `${backendHttp}/api/shops/${shopId}/printers`,
      { printers: printerData },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );


    console.log('✅ Sent printers to backend:', printerData.length);

    // ✅ Update the printer cache with sent data
    const allPrinters = await windowsPrinterDetector.getAllWindowsPrinters();
    
    // Merge sent printer data into existing cache
    const mergedPrinters = allPrinters.map(printer => {
      const sentPrinter = printerData.find(p => p.printerId === printer.printerId);
      if (sentPrinter) {
        // Use the sent printer's capabilities (includes edits)
        return {
          ...printer,
          capabilities: sentPrinter.capabilities
        };
      }
      return printer;
    });

    // Save merged data back to cache
    localStore.set('printerCache', mergedPrinters);
    console.log('💾 Updated printer cache with sent configurations');

    return {
      success: true,
      count: printerData.length
    };
  } catch (error: any) {
    console.error('❌ Send printers error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
});


// ✅ FIXED: Login with Printer Details
ipcMain.handle('login-printer', async (_event, loginData) => {
  try {
    const backendHttp = config.backendUrl.replace('ws', 'http');
    const apiUrl = `${backendHttp}/api/shops/login`;

    console.log('📤 Sending Login Request to:', apiUrl);

    // ✅ Get printer details with correct variable name
    const printerDetails = await windowsPrinterDetector.getDefaultPrinter();

    const payload = {
      ...loginData,
      printerId: config.printerId,
      printerDetails
    };

    const response = await axios.post(apiUrl, payload);

    if (response.data.success) {
      localStore.set('isRegistered', true);
      localStore.set('shopId', response.data.shopId);
      localStore.set('shopName', response.data.shopName);
       localStore.set('token', response.data.token);  
 localStore.set('ownerName', response.data.ownerName);
      return { success: true };
    }
    
    return { success: false, error: 'Login failed' };

  } catch (error: any) {
    console.error('Login API Error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.error || 'Invalid credentials' 
    };
  }
});

// Dialogs
ipcMain.handle('show-confirmation-dialog', async (_event, options) => {
  const result = await dialog.showMessageBox(mainWindow!, {
    type: 'question',
    buttons: options.buttons,
    title: options.title,
    message: options.message,
    defaultId: 0,
    cancelId: 1
  });
  return result.response === 0;
});

ipcMain.handle('show-error-dialog', async (_event, options) => {
  await dialog.showMessageBox(mainWindow!, {
    type: 'error',
    title: options.title,
    message: options.message,
    buttons: ['OK']
  });
});

// ✅ FIXED: Registration with Printer Details
ipcMain.handle('register-printer', async (_event, formData) => {
  try {
    const backendHttp = config.backendUrl.replace('ws', 'http');
    const apiUrl = `${backendHttp}/api/shops/onboard`;

    console.log('📤 Sending Registration to:', apiUrl);

    // ✅ Get Windows printer details with correct variable name
    const printerDetails = await windowsPrinterDetector.getDefaultPrinter();

    const payload = {
      ...formData,
      printerId: printerDetails?.printerId || config.printerId,
      printerName: printerDetails?.printerName || 'Counter Printer 01',
      printerDetails 
    };

    const response = await axios.post(apiUrl, payload);

    if (response.data.success) {
      localStore.set('isRegistered', true);
      localStore.set('shopId', response.data.shopId);
      localStore.set('shopName', formData.shopName);
       localStore.set('token', response.data.token);  
      localStore.set('ownerName', formData.ownerName);
      return { success: true };
    }
    
    return { success: false, error: 'Unknown response' };

  } catch (error: any) {
    console.error('Registration API Error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to connect to server' 
    };
  }
});
// src/main/main.ts

// ✅ Add this handler after other printer-related handlers
ipcMain.handle('save-printer-edits', (_event, printerId: string, capabilities: any) => {
  try {
    windowsPrinterDetector.saveEditedPrinter(printerId, capabilities);
    console.log('✅ Saved printer edits for:', printerId);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Failed to save printer edits:', error);
    return { success: false, error: error.message };
  }
});

// Registration Check
ipcMain.handle('check-registration', () => {
  const isRegistered = localStore.get('isRegistered');
  const shopId = localStore.get('shopId');
  return { isRegistered: !!isRegistered, shopId };
});


//  : Fetch from Backend with Cache Fallback
ipcMain.handle('get-shop-info', async () => {
  // 1. Initialize with Cached Values (Fallback)
  let shopName = localStore.get('shopName') || '';
  let ownerName = localStore.get('ownerName') || '';
  let pricing = localStore.get('pricing') || { 
    bwPerPage: 5, 
    colorPerPage: 10 
  };

  const shopId = localStore.get('shopId');
  const token = localStore.get('token');

  // 2. If online, try to fetch fresh data
  if (shopId && token) {
    try {
      const backendHttp = config.backendUrl.replace('ws', 'http');
      
      const response = await axios.get(`${backendHttp}/api/shops/${shopId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data) {
        const shop = response.data;
        console.log('✅ Fetched fresh shop info from backend');

        // Update variables
        shopName = shop.shopName || shopName;
        ownerName = shop.ownerName || ownerName;
        
        // Update pricing if it exists in response
        if (shop.pricing) {
          pricing = {
            bwPerPage: shop.pricing.bwPerPage ?? pricing.bwPerPage,
            colorPerPage: shop.pricing.colorPerPage ?? pricing.colorPerPage
          };
        }
        console.log('🏪 Updated Shop Info:', { shopName, ownerName, pricing });

        // 3. Update Cache (so it's available next time offline)
        localStore.set('shopName', shopName);
        localStore.set('ownerName', ownerName);
        localStore.set('pricing', pricing);
      }
    } catch (error: any) {
      console.log('⚠️ Could not fetch fresh shop info (using cache):', error.message);
    }
  }
    console.log('🏪 Returning Shop Info:', { shopName, ownerName, pricing });
  return { shopName, ownerName, pricing };
});

ipcMain.handle('clear-printer-cache', () => {
  windowsPrinterDetector.clearCache();
  return { success: true };
});
ipcMain.handle('refresh-printers', async () => {
  const printers = await windowsPrinterDetector.refreshPrinters();
  return printers;
});
// Logout
ipcMain.handle('logout', () => {
  console.log('🚪 Logging out...');

  // 1. Close WebSocket
  if (wsClient) {
    wsClient.close();
  }

  // 2. Clear all local store data
  localStore.clearAll(); // ✅ We'll add this method

  // 3. Clean up print manager
  if (printManager) {
    printManager.cleanup();
  }

  console.log('✅ Logout complete');
  return { success: true };
});
async function convertDocxToPdf(docxPath: string, outputPdfPath: string): Promise<string> {
  try {
    // Try using LibreOffice (most reliable)
    const isWindows = process.platform === 'win32';
    const libreOfficeCmd = isWindows
      ? '"C:\\Program Files\\LibreOffice\\program\\soffice.exe"'
      : 'soffice';

    try {
      // Try to use LibreOffice for conversion
      execSync(
        `${libreOfficeCmd} --headless --convert-to pdf --outdir "${path.dirname(outputPdfPath)}" "${docxPath}"`,
        { stdio: 'pipe', timeout: 30000 }
      );

      // LibreOffice creates PDF with same name in same directory
      const libOfficePdfPath = path.join(
        path.dirname(outputPdfPath),
        path.basename(docxPath, path.extname(docxPath)) + '.pdf'
      );

      if (fs.existsSync(libOfficePdfPath)) {
        console.log('✅ Converted DOCX to PDF using LibreOffice:', libOfficePdfPath);
        return libOfficePdfPath;
      }
    } catch (libError) {
      console.warn('LibreOffice conversion failed, trying alternative method:', (libError as Error).message);
    }

    // Fallback: Create a simple PDF from DOCX content using HTML
    return await convertDocxToHtmlToPdf(docxPath, outputPdfPath);
  } catch (error) {
    console.error('Failed to convert DOCX:', error);
    throw error;
  }
}
async function convertDocxToHtmlToPdf(docxPath: string, outputPdfPath: string): Promise<string> {
  try {
    const mammoth = await import('mammoth');

    // ✅ Use path instead of buffer
    const result = await mammoth.convertToHtml({ path: docxPath });
    const html = result.value;

    // Create a hidden window to render HTML and convert to PDF
    const convertWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        offscreen: true,
        contextIsolation: true
      }
    });

    // Load HTML content
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            padding: 20mm;
            margin: 0;
            color: #333;
          }
          p { margin: 12px 0; }
          h1, h2, h3, h4, h5, h6 { margin-top: 18px; margin-bottom: 12px; }
          table { border-collapse: collapse; width: 100%; margin: 12px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          strong { font-weight: bold; }
          em { font-style: italic; }
          img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;

    await convertWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);
    
    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Convert to PDF
    const pdfBuffer = await convertWindow.webContents.printToPDF({
      landscape: false,
      printBackground: true,
      pageSize: 'A4',
      margins: {
        top: 0.5,
        bottom: 0.5,
        left: 0.5,
        right: 0.5
      }
    });

    // Save PDF
    fs.writeFileSync(outputPdfPath, pdfBuffer);
    convertWindow.close();

    console.log('✅ Converted DOCX to PDF via HTML:', outputPdfPath);
    return outputPdfPath;
  } catch (error) {
    console.error('Failed to convert DOCX to HTML to PDF:', error);
    throw error;
  }
}

async function convertImageToPdf(imagePath: string, outputPdfPath: string): Promise<string> {
  try {
    // Create a hidden window
    const convertWindow = new BrowserWindow({
      show: false,
      width: 850,
      height: 1100,
      webPreferences: {
        offscreen: true,
        contextIsolation: true
      }
    });

    // Create simple HTML with image - same styling as DOCX
    const imageUrl = `file://${imagePath.replace(/\\/g, '/')}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              margin: 0;
              padding: 20mm;
              display: flex;
              justify-content: center;
              align-items: flex-start;
              background: white;
              min-height: 100vh;
            }
            
            .image-container {
              display: flex;
              justify-content: center;
              align-items: center;
              width: 100%;
              max-width: 210mm;
            }
            
            img {
              max-width: 100%;
              height: auto;
              display: block;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
          </style>
        </head>
        <body>
          <div class="image-container">
            <img src="${imageUrl}" />
          </div>
        </body>
      </html>
    `;

    await convertWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    
    // Wait for image to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Convert to PDF
    const pdfBuffer = await convertWindow.webContents.printToPDF({
      landscape: false,
      printBackground: true,
      pageSize: 'A4',
      margins: {
        top: 0.5,
        bottom: 0.5,
        left: 0.5,
        right: 0.5
      }
    });

    // Save to temp file
    fs.writeFileSync(outputPdfPath, pdfBuffer);

    // Close the window
    convertWindow.close();

    console.log('✅ Converted image to PDF:', outputPdfPath);
    return outputPdfPath;
  } catch (error) {
    console.error('Failed to convert image to PDF:', error);
    throw error;
  }
}

// Cleanup
app.on('before-quit', (event) => {
  console.log('🛑 App is quitting...');

  // Cleanup WebSocket
  if (wsClient) {
    wsClient.close();
  }

  // Cleanup PrintManager
  if (printManager) {
    printManager.cleanup();
  }
});

 