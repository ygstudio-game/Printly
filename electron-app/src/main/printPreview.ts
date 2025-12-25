// electron-app/src/main/printPreview.ts
import { BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { PrintJob } from '../types';

export class PrintPreview {
  private previewWindow: BrowserWindow | null = null;

  async showPreview(pdfPath: string, job: PrintJob): Promise<boolean> {
    return new Promise((resolve) => {
      // Create preview window
      this.previewWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: `Print Preview - ${job.fileName}`,
        webPreferences: {
          preload: path.join(__dirname, 'previewPreload.js'),
          contextIsolation: true,
          nodeIntegration: false
        }
      });

      // Load preview HTML
      this.previewWindow.loadFile(path.join(__dirname, '../renderer/preview.html'));

      // Send job data and PDF path to preview window
      this.previewWindow.webContents.on('did-finish-load', () => {
        this.previewWindow?.webContents.send('load-preview', {
          pdfPath,
          job
        });
      });

      // Handle user actions
      ipcMain.once('preview-print', (_event, updatedSettings) => {
        this.closePreview();
        resolve(true);
        // Update job settings with user changes
        Object.assign(job.settings, updatedSettings);
      });

      ipcMain.once('preview-cancel', () => {
        this.closePreview();
        resolve(false);
      });

      // Handle window close
      this.previewWindow.on('closed', () => {
        this.previewWindow = null;
        resolve(false);
      });
    });
  }

  private closePreview() {
    if (this.previewWindow && !this.previewWindow.isDestroyed()) {
      this.previewWindow.close();
    }
    this.previewWindow = null;
  }
}
