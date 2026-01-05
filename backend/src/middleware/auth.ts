import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Shop from '../models/Shop.js';

export interface AuthRequest extends Request {
  userId?: string;
  userShopId?: string; // Optional: only set if user owns a shop
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret) as { userId: string };
    
    req.userId = decoded.userId;
    
    // Fetch user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }
    
    // ✅ Check if user owns a shop (optional)
    const shop = await Shop.findOne({ ownerId: user._id });
    if (shop) {
      req.userShopId = shop.shopId; // Attach shop ID if exists
    }
    
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}
