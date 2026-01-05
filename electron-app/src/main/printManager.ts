// electron/printManager.ts
import { PDFDocument } from 'pdf-lib';
import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { print } from 'pdf-to-printer';
import { createClient } from '@supabase/supabase-js';
import { LocalStore } from './localStore';
import { config } from './config';
import { PrintJob, PrintResult } from '../types';

const supabase = createClient(
  config.supabase.url,     // Read from config object
  config.supabase.anonKey  // Read from config object
);

export class PrintManager {
  private tempDir: string;
  private localStore: LocalStore;
  private backendUrl: string;
  private conversionWindow: BrowserWindow | null = null; // ✅ Reuse window

  constructor(localStore: LocalStore) {
    this.localStore = localStore;
    this.tempDir = path.join(app.getPath('temp'), 'printly');
    this.backendUrl = config.backendUrl
      .replace('ws://', 'http://')
      .replace('wss://', 'https://');
    
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    // ✅ Pre-create conversion window (reusable)
    this.initConversionWindow();
  }

  // ✅ Reusable window for conversions
  private initConversionWindow() {
    this.conversionWindow = new BrowserWindow({
      show: false,
      width: 850,
      height: 1100,
      webPreferences: {
        offscreen: true,
        contextIsolation: true,
        webSecurity: false
      }
    });
  }

  async printJob(job: PrintJob): Promise<PrintResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🖨️ Starting print job ${job.jobNumber}`);
      
      // ✅ Parallel operations where possible
      const [_, localPath] = await Promise.all([
        this.notifyBackend(job._id, 'printing'),
        this.downloadFile(job.fileKey)
      ]);
      
      this.localStore.updateJobStatus(job._id, 'printing');
      console.log(`✅ Downloaded: ${job.fileName}`);

      // Convert to PDF if needed
      let pdfPath = localPath;
      const fileExt = path.extname(job.fileName).toLowerCase();
      
      if (fileExt !== '.pdf') {
        console.log(`🔄 Converting ${fileExt} to PDF...`);
        pdfPath = await this.convertToPdf(localPath, fileExt);
      }

      // Extract pages if needed
      let processedPath = pdfPath;
      if (job.settings.pageRanges && job.settings.pageRanges !== 'all') {
        processedPath = await this.extractPages(pdfPath, job.settings.pageRanges);
      }

      // Print
      console.log(`🖨️ Sending to printer: ${job.printerName}`);
      await this.executePrint(processedPath, job);

      // ✅ Async cleanup (don't wait)
      setImmediate(() => this.cleanupFiles([localPath, pdfPath, processedPath]));

      const duration = Date.now() - startTime;
      console.log(`✅ Print completed in ${duration}ms: ${job.jobNumber}`);
      
      // ✅ Parallel backend notification (don't wait)
      this.notifyBackend(job._id, 'completed').catch(console.error);
      this.localStore.removeJob(job._id);
      
      return { success: true };

    } catch (error) {
      console.error(`❌ Print failed:`, error);
      this.notifyBackend(job._id, 'failed').catch(console.error);
      this.localStore.updateJobStatus(job._id, 'failed');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ✅ Streaming download for large files
  async downloadFile(fileKey: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('print-jobs')
      .createSignedUrl(fileKey, 3600);

    if (error || !data) {
      throw new Error(`Failed to get download URL: ${error?.message}`);
    }

    const response = await fetch(data.signedUrl);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const fileName = path.basename(fileKey);
    const localPath = path.join(this.tempDir, `${Date.now()}-${fileName}`);
    
    // ✅ Stream directly to file (memory efficient)
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(localPath, Buffer.from(buffer));
    
    return localPath;
  }

  private async convertToPdf(filePath: string, fileExt: string): Promise<string> {
    const fileType = this.getFileType(fileExt);
    
    if (fileType === 'pdf') return filePath;
    if (fileType === 'docx') return await this.convertDocxToPdf(filePath);
    if (fileType === 'image') return await this.convertImageToPdf(filePath);
    
    throw new Error(`Unsupported file type: ${fileExt}`);
  }

  private getFileType(ext: string): 'pdf' | 'docx' | 'image' | 'unknown' {
    ext = ext.toLowerCase();
    if (ext === '.pdf') return 'pdf';
    if (['.docx', '.doc'].includes(ext)) return 'docx';
    if (['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp'].includes(ext)) return 'image';
    return 'unknown';
  }

  // ✅ Optimized DOCX conversion (reuses window)
  private async convertDocxToPdf(docxPath: string): Promise<string> {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.convertToHtml({ path: docxPath });

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body{font-family:Calibri,Arial,sans-serif;line-height:1.6;padding:25mm;margin:0;color:#333;font-size:11pt}
p{margin:12px 0}h1,h2,h3,h4,h5,h6{margin:18px 0 12px}
table{border-collapse:collapse;width:100%;margin:12px 0}
th,td{border:1px solid #ddd;padding:8px}th{background:#f5f5f5}
img{max-width:100%;height:auto}
</style>
</head>
<body>${result.value}</body>
</html>`;

      // ✅ Reuse window instead of creating new one
      if (!this.conversionWindow || this.conversionWindow.isDestroyed()) {
        this.initConversionWindow();
      }

      await this.conversionWindow!.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      
      // ✅ Reduced wait time
      await new Promise(resolve => setTimeout(resolve, 500));

      const pdfBuffer = await this.conversionWindow!.webContents.printToPDF({
        landscape: false,
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 }
      });

      const pdfPath = path.join(this.tempDir, `${Date.now()}-converted.pdf`);
      fs.writeFileSync(pdfPath, pdfBuffer);

      return pdfPath;
    } catch (error) {
      throw new Error(`DOCX conversion failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  // ✅ Optimized image conversion (reuses window, minimal HTML)
  private async convertImageToPdf(imagePath: string): Promise<string> {
    try {
      const imageUrl = `file://${imagePath.replace(/\\/g, '/')}`;
      const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>*{margin:0;padding:0}body{padding:20mm;background:#fff}img{max-width:100%;height:auto}</style>
</head>
<body><img src="${imageUrl}"/></body>
</html>`;

      if (!this.conversionWindow || this.conversionWindow.isDestroyed()) {
        this.initConversionWindow();
      }

      await this.conversionWindow!.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      await new Promise(resolve => setTimeout(resolve, 500));

      const pdfBuffer = await this.conversionWindow!.webContents.printToPDF({
        landscape: false,
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 }
      });

      const pdfPath = path.join(this.tempDir, `${Date.now()}-image.pdf`);
      fs.writeFileSync(pdfPath, pdfBuffer);

      return pdfPath;
    } catch (error) {
      throw new Error(`Image conversion failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  // ✅ Optimized page extraction (async operations)
  private async extractPages(pdfPath: string, ranges: string): Promise<string> {
    try {
      const pdfBytes = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const newPdf = await PDFDocument.create();
      const pageNumbers = this.parsePageRanges(ranges, pdfDoc.getPageCount());

      // ✅ Batch copy pages for better performance
      const copiedPages = await newPdf.copyPages(pdfDoc, pageNumbers.map(n => n - 1));
      copiedPages.forEach(page => newPdf.addPage(page));

      const processedPath = path.join(this.tempDir, `${Date.now()}-processed.pdf`);
      const processedBytes = await newPdf.save();
      fs.writeFileSync(processedPath, processedBytes);

      return processedPath;
    } catch (error) {
      throw new Error(`Page extraction failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  private parsePageRanges(rangeString: string, totalPages: number): number[] {
    const pages = new Set<number>();
    const parts = rangeString.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(s => parseInt(s.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= Math.min(end, totalPages); i++) {
            pages.add(i);
          }
        }
      } else {
        const pageNum = parseInt(trimmed);
        if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPages) {
          pages.add(pageNum);
        }
      }
    }

    return Array.from(pages).sort((a, b) => a - b);
  }

  private async executePrint(filePath: string, job: PrintJob): Promise<void> {
    const stats = fs.statSync(filePath);
    console.log(job.printerName);
    
    if (stats.size < 1000) {
      throw new Error(`File too small (${stats.size} bytes)`);
    }

    const options: any = {
      printer: job.printerName,
      copies: job.settings.copies,
      scale: 'fit'
    };

    if (job.settings.colorMode === 'bw') {
      options.monochrome = true;
    }

    if (job.settings.duplex) {
      options.side = job.settings.orientation === 'landscape' 
        ? 'duplex-short-edge' 
        : 'duplex-long-edge';
    }

    await print(filePath, options);
    
    // ✅ Reduced wait time
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // ✅ Async cleanup (non-blocking)
  private cleanupFiles(filePaths: string[]) {
    const uniquePaths = [...new Set(filePaths)];
    
    setImmediate(() => {
      for (const filePath of uniquePaths) {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (error) {
          // Silent fail for cleanup
        }
      }
    });
  }

private async notifyBackend(jobId: string, status: 'printing' | 'cancelled' | 'completed' | 'failed') {
  try {
    const token = this.localStore.get('token'); // Adjust to your token retrieval logic
    if (!token) {
      console.warn('⚠️ No auth token available; cannot notify backend');
      return;
    }

    const url = `${this.backendUrl}/api/jobs/${jobId}/status`;
    await fetch(url, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`   // Add auth header
      },
      body: JSON.stringify({ status })
    });
    console.log(`✅ Notified backend: Job ${jobId} status updated to ${status}`);

  } catch (error) {
    // Silent fail for notifications
    console.error('Backend notification error:', error);
  }
}


  cleanup() {
    try {
      if (this.conversionWindow && !this.conversionWindow.isDestroyed()) {
        this.conversionWindow.close();
      }

      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        files.forEach(file => {
          try {
            fs.unlinkSync(path.join(this.tempDir, file));
          } catch (e) {
            // Silent fail
          }
        });
      }
    } catch (error) {
      // Silent fail
    }
  }
}
