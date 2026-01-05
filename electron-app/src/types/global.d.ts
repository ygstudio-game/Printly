import { PrintJob, PrintResult } from './index';
import { SystemPrinter } from './printer'; 

export { PrintJob, PrintResult,SystemPrinter };

declare global {
  interface Window {
    electron: {
      // Event Listeners
      on: (channel: string, callback: (data: any) => void) => void;
     clearPrinterCache: () => Promise<{ success: boolean }>;
      refreshPrinters: () => Promise<SystemPrinter[]>;
      downloadJobFile: (job: PrintJob) => Promise<string>;
      generatePrintPreview: (settings: any, sourcePdfPath: string) => Promise<string>;
            convertToPdf: (filePath: string, fileType: string) => Promise<string>;
readPdfFile: (filePath: string) => Promise<Buffer>;
      // Job Management
 syncJobsFromBackend: () => Promise<{ success: boolean; jobs: any[] }>;
  getHistoryFromBackend: () => Promise<PrintJob[]>;     
 getPendingJobs: (syncWithBackend?: boolean) => Promise<any[]>;      printJob: (job: PrintJob) => Promise<PrintResult>;
      getAllPrinters: (forceRefresh?: boolean) => Promise<SystemPrinter[]>;
sendPrintersToBackend: (printers: SystemPrinter[]) => Promise<{ 
        success: boolean; 
        count?: number; 
        error?: string 
      }>;            savePrinterEdits: (printerId: string, capabilities: {
        supportsColor: boolean;
        supportsDuplex: boolean;
        paperSizes: string[];
      }) => Promise<{ success: boolean }>;
      // Dialogs
      showConfirmationDialog: (options: {
        title: string;
        message: string;
        buttons: string[];
      }) => Promise<boolean>;
      
      showErrorDialog: (options: {
        title: string;
        message: string;
      }) => Promise<void>;
      // delete Jobs
            removeJob: (jobId: string) => Promise<{ success: boolean; error?: string }>;
      removeAllJobs: () => Promise<{ success: boolean; error?: string }>;

      // Registration & Authentication
      registerPrinter: (data: any) => Promise<{ success: boolean; error?: string }>;
      checkRegistration: () => Promise<{ isRegistered: boolean; shopId?: string }>;
      
      // ✅ NEW: Shop Info & Logout
     getShopInfo: () => Promise<{ 
        shopName: string; 
        ownerName: string; 
        pricing?: { bwPerPage: number; colorPerPage: number } 
      }>;
            loginPrinter: (loginData: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
      logout: () => Promise<{ success: boolean }>;
      
      // Generic invoke (fallback)
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}

 
