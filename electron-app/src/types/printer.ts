// src/renderer/types/printer.ts
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
