export interface Printer {
  _id: string;
  displayName: string;
  printerName: string;
  capabilities: {
    supportsColor: boolean;
    supportsDuplex: boolean;
    paperSizes: string[];
    maxPaperSize: string;
  };
  pricing: {
    bwPerPage: number;
    colorPerPage: number | null;
  };
  status: 'online' | 'offline' | 'busy';
}

export interface Shop {
  _id: string;
  shopId: string;
  shopName: string;
  location: {
    address: string;
    city: string;
    coordinates?: { lat: number; lng: number };
  };
  contact: {
    phone: string;
    email: string;
  };
  timings: {
    open: string;
    close: string;
  };
  rating: number;
  totalReviews: number;
}

export interface PrintSettings {
  colorMode: 'bw' | 'color';
  paperSize: string;
  copies: number;
  duplex: boolean;
  pageRanges: string;
  orientation: 'portrait' | 'landscape';
  totalPages: number;
}

export interface PrintJob {
  _id: string;
  jobNumber: string;
  fileName: string;
  fileSize: number;
  estimatedCost: number;
  settings: PrintSettings;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  timestamps: {
    created: string;
    printStarted?: string;
    completed?: string;
  };
  shopId?: {
    shopName: string;
 location: {
      address: string;
      city: string;
      coordinates?: { lat: number; lng: number };
    };
    };
}