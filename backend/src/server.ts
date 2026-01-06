// backend/src/server.ts
import dotenv from 'dotenv';
if (process.env.NODE_ENV == 'development') {
  dotenv.config();
  console.log("DEBUG: PORT is", process.env.PORT);
}

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

import authRoutes from './routes/auth.js';
import shopsRoutes from './routes/shops.js';
import printersRoutes from './routes/printers.js';
import jobsRoutes from './routes/jobs.js';
import filesRoutes from './routes/files.js';
import adminRoutes from './routes/admin.js';
import PrintJob from './models/PrintJob.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? process.env.FRONTEND_URL_PRODUCTION || 'http://printly.'
  : ['http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// MongoDB
mongoose.connect(process.env.MONGODB_URI!)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/shops',shopsRoutes);
app.use('/api/printers',printersRoutes);
app.use('/api/jobs',jobsRoutes);
app.use('/api/files',filesRoutes);
app.use('/api/admin', adminRoutes);  

// ✅ Simple WebSocket - Track by shopId only
const shopConnections = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url!, 'ws://localhost');
  const shopId = url.searchParams.get('shopId'); // ✅ Use shopId instead
  const printerId = url.searchParams.get('printerId'); // Optional for logging

  if (!shopId) {
    console.warn('⚠️ WebSocket connection without shopId');
    ws.close();
    return;
  }

  // Add to shop's connection set
  if (!shopConnections.has(shopId)) {
    shopConnections.set(shopId, new Set());
  }
  shopConnections.get(shopId)!.add(ws);
  
  console.log(`✅ Printer connected to shop ${shopId} (printerId: ${printerId || 'unknown'})`);
  console.log(`📊 Total connections for shop ${shopId}: ${shopConnections.get(shopId)!.size}`);

  ws.on('close', () => {
    const connections = shopConnections.get(shopId);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        shopConnections.delete(shopId);
      }
    }
    console.log(`❌ Printer disconnected from shop ${shopId}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// ✅ Broadcast to all printers in a shop
export function notifyShop(shopId: string, job: any) {
  const connections = shopConnections.get(shopId);
  
  if (!connections || connections.size === 0) {
    console.warn(`⚠️ No printers connected for shop ${shopId}`);
    return false;
  }

  let notifiedCount = 0;
  const message = JSON.stringify({ type: 'NEW_JOB', job });

  connections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      notifiedCount++;
    }
  });

  console.log(`📡 Notified ${notifiedCount} printer(s) in shop ${shopId} of job ${job.jobNumber}`);
  return notifiedCount > 0;
}

// File cleanup job
setInterval(async () => {
  const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
  
  try {
    const jobsToClean = await PrintJob.find({
      $or: [
        { status: 'completed', 'timestamps.completed': { $lt: twentyMinutesAgo }, fileDeleted: false },
        { status: 'pending', 'timestamps.created': { $lt: twentyMinutesAgo }, fileDeleted: false }
      ]
    });

    for (const job of jobsToClean) {
      console.log(`🧹 Cleaned up job ${job.jobNumber}`);
      await job.deleteOne();
    }
  } catch (error) {
    console.error('Cleanup job failed:', error);
  }
}, 5 * 60 * 1000);

// const PORT = process.env.PORT || 3001;
// server.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
// });

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// REQUIRED: Export the Express app for Vercel
export default app;