import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  isGuest: boolean;
  guestToken?: string;
  name: string;
  deviceId?: string;
  email?: string;
  phone?: string;
  passwordHash?: string;
  role: 'customer' | 'shop_owner';
  createdAt: Date;
  lastActive: Date;
}

const UserSchema = new Schema<IUser>({
  isGuest: { type: Boolean, default: true },
  name: { 
    type: String, 
    required: false 
  },  guestToken: { type: String, sparse: true, unique: true },
  deviceId: { 
    type: String, 
    sparse: true,
    unique: true   
  },  email: { type: String, sparse: true, unique: true },
  phone: String,
  passwordHash: String,
 role: { 
    type: String, 
    enum: ['customer', 'shop_owner', 'guest'], 
    default: 'customer' 
  },  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }
});
UserSchema.index({ deviceId: 1, role: 1 });

export default mongoose.model<IUser>('User', UserSchema);
