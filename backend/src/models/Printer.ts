import mongoose, { Schema, Document } from 'mongoose';

export interface IPrinter extends Document {
  shopId?: mongoose.Types.ObjectId;
  printerId: string;
  printerName: string;
  displayName: string;
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
  status: 'online' | 'offline' | 'busy' | 'error';
  lastHeartbeat?: Date;
  systemInfo?: {  
    os: string;
    hostname: string;
  };
  createdAt: Date;
}

const PrinterSchema = new Schema<IPrinter>({
  shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
  printerId: { type: String, required: true, unique: true },
  printerName: { type: String, default: 'Generic Printer' },
  displayName: { type: String, default: 'Counter Printer' },
  capabilities: {
    supportsColor: { type: Boolean, default: false },
    supportsDuplex: { type: Boolean, default: false },
    paperSizes: { type: [String], default: ['A4'] },
    maxPaperSize: { type: String, default: 'A4' }
  },
  pricing: {
    bwPerPage: { type: Number, default: 5 },  
    colorPerPage: { type: Number, default: 10 }
  },
  status: { type: String, enum: ['online', 'offline', 'busy', 'error'], default: 'offline' },
  lastHeartbeat: Date,
  systemInfo: {  // ✅ NEW
    os: String,
    hostname: String
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IPrinter>('Printer', PrinterSchema);
