// electron-app/src/types/index.ts
export interface PrintJob {
  _id: string;
  jobNumber: string;
  name?: string;
    userName?: string; 

   shopId?: string;  
  userId?: string;  
  printerId?: string;  
  fileName: string;
  fileKey: string; 
  downloadedPath?: string; 
  localPdfPath?: string;   
  printerName: string;
  settings: {
    colorMode: 'bw' | 'color';
    paperSize: string;
    copies: number;
    duplex: boolean;
    pageRanges: string;
    orientation: 'portrait' | 'landscape';
    totalPages: number; // ✅ Add this
  };
  estimatedCost: number;
  status: string;
  timestamps: {
    created: Date;
    printStarted?: Date;
    completed?: Date;
  };
}

export interface PrintResult {
  success: boolean;
  error?: string;
}

export interface SystemPrinter {
  printerId: string;
  printerName: string;
  displayName: string;
  capabilities: {
    supportsColor: boolean;
    supportsDuplex: boolean;
    paperSizes: string[];
    maxPaperSize: string;
    isDefault: boolean;
  };
  pricing: {
    bwPerPage: number;
    colorPerPage: number | null;
  };
  systemInfo: {
    os: string;
    hostname: string;
    driverVersion: string;
    model: string;
  };
  status: 'online' | 'offline' | 'error';
}
export  interface JobsListProps {
  jobs: PrintJob[];
  onPrintJob: (job: PrintJob) => void;
  loadingJobId: string | null;
  printingJobId: string | null;
}