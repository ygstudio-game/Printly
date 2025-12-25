import mongoose, { Schema, Document } from 'mongoose';

export interface IShop extends Document {
  shopId: string;
  shopName: string;
  ownerId: mongoose.Types.ObjectId;
  
  // Optional: Store references to printers (for quick lookup)
  printers?: mongoose.Types.ObjectId[]; 
  pricing: {
    bwPerPage: number;
    colorPerPage: number | null;
  };
  location: {
    address: string;
    city: string;
    state?: string;
    pincode?: string;
    coordinates?: { lat: number; lng: number };
  };
  contact: {
    phone?: string;
    email: string;
  };
  timings: {
    open: string;
    close: string;
    weeklyOff: string[];
  };
  status: 'active' | 'inactive';
  createdAt: Date;
}

const ShopSchema = new Schema<IShop>({
  shopId: { type: String, required: true, unique: true },
  shopName: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  
  // ✅ Keep this if you want to store printer refs (optional)
  printers: [{ type: Schema.Types.ObjectId, ref: 'Printer' }],
  pricing: {
    bwPerPage: { type: Number, default: 5 },
    colorPerPage: { type: Number, default: 10 }
  },
  location: {
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    coordinates: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 }
    }
  },

  contact: {
    phone: { type: String, default: '' },
    email: { type: String, required: true }
  },

  timings: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '21:00' },
    weeklyOff: { type: [String], default: ['Sunday'] }
  },

  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IShop>('Shop', ShopSchema);
