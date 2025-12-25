// backend/src/models/PrintJob.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IPrintJob extends Document {
  userId: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId; // ✅ Changed to ObjectId
  printerId: mongoose.Types.ObjectId; // ✅ Changed to ObjectId
  printerName: string; // ✅ Added
  jobNumber: string;
  fileKey: string;
  fileName: string;
  estimatedCost: number;
  status: 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled';
  settings: {
    colorMode: 'bw' | 'color';
    paperSize: string;
    copies: number;
    duplex: boolean;
    pageRanges: string;
    orientation: 'portrait' | 'landscape';
    totalPages: number;
  };
  timestamps: {
    created: Date;
    updated: Date;
    printStarted?: Date;
    completed?: Date;
  };
}

const printJobSchema = new Schema<IPrintJob>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  shopId: { 
    type: Schema.Types.ObjectId, // ✅ Changed to ObjectId
    ref: 'Shop',
    required: true 
  },
  printerId: { 
    type: Schema.Types.ObjectId, // ✅ Changed to ObjectId
    ref: 'Printer',
    required: true 
  },
  // ✅ Added printerName field
  printerName: {
    type: String,
    required: true,
    default: 'Default Printer'
  },
  jobNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  fileKey: { 
    type: String, 
    required: true 
  },
  fileName: { 
    type: String, 
    required: true 
  },
  estimatedCost: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'printing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  settings: {
    colorMode: { type: String, required: true },
    paperSize: { type: String, required: true },
    copies: { type: Number, required: true },
    duplex: { type: Boolean, required: true },
    pageRanges: { type: String, required: true },
    orientation: { type: String, required: true },
    totalPages: { type: Number, required: true }
  },
  timestamps: {
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },
    printStarted: { type: Date },
    completed: { type: Date }
  }
});

export default mongoose.model<IPrintJob>('PrintJob', printJobSchema);
