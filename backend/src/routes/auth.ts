// backend/src/routes/auth.ts

import { Router, Request, Response } from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const router = Router();

// ✅ Guest User Creation
router.post('/guest', async (req: Request, res: Response) => {
  try {
    const { deviceId, name } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    // Check if guest already exists for this device
    let user = await User.findOne({ 
      deviceId,
      role: 'guest'
    });

    if (!user) {
      // Create new guest user
      user = new User({
        name: name || `Guest ${deviceId.slice(0, 6)}`,
        email: `guest_${deviceId}@printly.temp`,
        role: 'guest',
        deviceId
      });
      await user.save();
      console.log('✅ Created new guest user:', user.name);
    } else if (name && user.name !== name) {
      // Update name if provided and different
      user.name = name;
      await user.save();
      console.log('✅ Updated guest user name:', user.name);
    } else {
      console.log('✅ Existing guest user found:', user.name);
    }

    const token = jwt.sign(
      { userId: user._id.toString(), isGuest: true },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({ 
      token, 
      userId: user._id.toString(),
      name: user.name,
      isGuest: true 
    });
  } catch (error: any) {
    console.error('Guest user creation error:', error);
    res.status(500).json({ error: 'Failed to create guest user' });
  }
});

// ✅ Register (Fixed)
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, guestUserId } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if email exists (excluding current guest user if converting)
    const existing = await User.findOne({ email });
    if (existing && (!guestUserId || existing._id.toString() !== guestUserId)) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user;
    
    if (guestUserId) {
      user = await User.findByIdAndUpdate(
        guestUserId,
        {
          name,  // ✅ Use provided name, not old name
          email,
          passwordHash,
          role: 'customer',
          $unset: { deviceId: 1 } // ✅ Remove deviceId when converting
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ error: 'Guest user not found' });
      }

      console.log('✅ Converted guest to registered user:', user.email);
    } else {
      // Create new user
      user = await User.create({
        name,
        email,
        passwordHash,
        role: 'customer'
      });

      console.log('✅ Created new user:', user.email);
    }

    const token = jwt.sign(
      { userId: user._id.toString(), isGuest: false },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    res.status(201).json({ 
      token, 
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ✅ Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email, role: { $ne: 'guest' } }); // ✅ Exclude guests from login
    
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), isGuest: false },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    console.log('✅ User logged in:', user.email);

    res.json({ 
      token, 
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
