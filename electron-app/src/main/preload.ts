import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  invoke: (channel: string, ...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args);
  },
  loginPrinter: (loginData: any) =>
    ipcRenderer.invoke("login-printer", loginData),
  getShopInfo: () => ipcRenderer.invoke("get-shop-info"),
  logout: () => ipcRenderer.invoke("logout"),
  checkRegistration: () => ipcRenderer.invoke("check-registration"),
  syncJobsFromBackend: (): Promise<{ success: boolean; jobs: any[] }> =>
    ipcRenderer.invoke('sync-jobs-from-backend'),
  getPendingJobs: (syncWithBackend?: boolean): Promise<any[]> =>
    ipcRenderer.invoke('get-pending-jobs', syncWithBackend),
  generatePrintPreview: (
    settings: any,
    sourcePdfPath: string
  ): Promise<string> =>
    ipcRenderer.invoke("generate-print-preview", settings, sourcePdfPath),

  readPdfFile: (filePath: string): Promise<ArrayBuffer> =>
    ipcRenderer.invoke("read-pdf-file", filePath),
  convertToPdf: (filePath: string, fileType: string): Promise<string> =>
    ipcRenderer.invoke("convert-to-pdf", filePath, fileType),
  printJob: (job: any) => ipcRenderer.invoke("print-job", job),
  showConfirmationDialog: (options: any) =>
    ipcRenderer.invoke("show-confirmation-dialog", options),
  showErrorDialog: (options: any) =>
    ipcRenderer.invoke("show-error-dialog", options),
  cancelJob: (jobId: string) => ipcRenderer.invoke("cancel-job", jobId),
    getHistoryFromBackend: () => ipcRenderer.invoke('get-history-from-backend'),
previewJob: (job: any) => ipcRenderer.invoke("preview-job", job),
  registerPrinter: (data: any) => ipcRenderer.invoke("register-printer", data),
  getAllPrinters: (forceRefresh?: boolean) =>
    ipcRenderer.invoke("get-all-printers", forceRefresh),
  sendPrintersToBackend: (printerIds: string[]) =>
    ipcRenderer.invoke("send-printers-to-backend", printerIds),
  clearPrinterCache: () => ipcRenderer.invoke("clear-printer-cache"),
  refreshPrinters: () => ipcRenderer.invoke("refresh-printers"),
  downloadJobFile: (job: any): Promise<string> =>
    ipcRenderer.invoke("download-job-file", job),
  savePrinterEdits: (printerId: string, capabilities: any) =>
    ipcRenderer.invoke("save-printer-edits", printerId, capabilities),
});
