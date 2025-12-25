  import { Router, Request, Response } from 'express';
  import Shop from '../models/Shop';
  import Printer from '../models/Printer';
  import User from '../models/User';
  const router = Router();
  import mongoose from 'mongoose';
  import bcrypt from 'bcryptjs';
  import { nanoid } from 'nanoid';
import PrintJob from '../models/PrintJob';
import { log } from 'console';
import { loadavg } from 'os';

  // ✅ UPDATED: Login Route with Printer Details
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { email, password, printerId, printerDetails } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (!user.passwordHash) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const shop = await Shop.findOne({ ownerId: user._id });
      if (!shop) {
        return res.status(404).json({ error: 'No shop found for this user' });
      }

      // ✅ Update printer with full details
      if (printerId && printerDetails) {
        await Printer.findOneAndUpdate(
          { printerId },
          { 
            shopId: shop._id,
            printerName: printerDetails.printerName,
            displayName: printerDetails.displayName,
            capabilities: printerDetails.capabilities,
            pricing: printerDetails.pricing,
            status: 'online',
            lastHeartbeat: new Date(),
            systemInfo: printerDetails.systemInfo
          },
          { upsert: true }
        );
      }

      res.json({
        success: true,
        shopId: shop.shopId,
        shopName: shop.shopName,
      });

    } catch (error: any) {
      console.error('Login Error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // ✅ FIXED: Bulk Update/Add Printers with Logging
  router.post('/update-printers', async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { shopId, printers } = req.body;

      console.log('📥 Received request:', {
        shopId,
        printerCount: printers?.length || 0
      });

      if (!printers || !Array.isArray(printers)) {
        throw new Error('Invalid printers data');
      }

      if (printers.length === 0) {
        throw new Error('No printers provided');
      }

      const shop = await Shop.findOne({ shopId }).session(session);
      if (!shop) {
        throw new Error('Shop not found');
      }

      console.log('✅ Shop found:', shop.shopName);

      const printerIds: mongoose.Types.ObjectId[] = [];

      // Create or update each printer
      for (const printerData of printers) {
        console.log('💾 Processing printer:', printerData.displayName);

        const printer = await Printer.findOneAndUpdate(
          { printerId: printerData.printerId },
          {
            shopId: shop._id,
            printerName: printerData.printerName,
            displayName: printerData.displayName,
            capabilities: printerData.capabilities,
            pricing: printerData.pricing,
            status: 'online',
            lastHeartbeat: new Date(),
            systemInfo: printerData.systemInfo
          },
          { upsert: true, new: true, session }
        );

        printerIds.push(printer._id);
        console.log('✅ Printer saved:', printer.displayName);
      }

      // Update shop with all printer references
      shop.printers = printerIds;
      await shop.save({ session });

      await session.commitTransaction();

      console.log('✅ All printers updated successfully');

      res.json({
        success: true,
        count: printerIds.length,
        message: `${printerIds.length} printer(s) updated successfully`
      });

    } catch (error: any) {
      await session.abortTransaction();
      console.error('❌ Update Printers Error:', error);
      res.status(400).json({ 
        error: error.message || 'Failed to update printers' 
      });
    } finally {
      session.endSession();
    }
  });

  router.get('/settings/:shopId', async (req: Request, res: Response) => {
    try {
      const { shopId } = req.params;

      const shop = await Shop.findOne({ shopId });
      if (!shop) {
        return res.status(404).json({ error: 'Shop not found' });
      }

      res.json({
        success: true,
        pricing: shop.pricing || { bwPerPage: 5, colorPerPage: 10 }
      });
    } catch (error: any) {
      console.error('❌ Get Settings Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ✅ Update Shop Settings
  router.post('/settings', async (req: Request, res: Response) => {
    try {
      const { shopId, pricing } = req.body;

      const shop = await Shop.findOneAndUpdate(
        { shopId },
        { pricing },
        { new: true }
      );

      if (!shop) {
        return res.status(404).json({ error: 'Shop not found' });
      }

      console.log('✅ Updated pricing for shop:', shopId);
      shop.pricing = pricing;
      await shop.save();
      res.json({
        success: true,
        message: 'Settings updated successfully'
      });
    } catch (error: any) {
      console.error('❌ Update Settings Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  // ✅ UPDATED: Onboard Route with Printer Details
  router.post('/onboard', async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { 
        ownerName, email, password, 
        shopName, address, city, 
        printerId, printerDetails
      } = req.body;

      const existingUser = await User.findOne({ email }).session(session);
      if (existingUser) {
        throw new Error('Email already registered');
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = new User({
        email,
        passwordHash,
        name: ownerName,
        role: 'shop_owner'
      });
      await user.save({ session });

      const shopId = `shop_${nanoid(10)}`;
      const shop = new Shop({
        shopId,
        shopName: shopName || `${ownerName}'s Shop`,
        ownerId: user._id,
        location: {
          address,
          city,
          coordinates: { lat: 0, lng: 0 }
        },
        contact: { email },
        status: 'active'
      });
      await shop.save({ session });

      // ✅ Create printer with full details
      const printer = await Printer.findOneAndUpdate(
        { printerId },
        { 
          shopId: shop._id,
          printerName: printerDetails?.printerName || 'Main Printer',
          displayName: printerDetails?.displayName || 'Counter Printer',
          capabilities: printerDetails?.capabilities || {
            supportsColor: true,
            supportsDuplex: false,
            paperSizes: ['A4'],
            maxPaperSize: 'A4'
          },
          pricing: printerDetails?.pricing || {
            bwPerPage: 5,
            colorPerPage: 10
          },
          status: 'online',
          lastHeartbeat: new Date(),
          systemInfo: printerDetails?.systemInfo
        },
        { upsert: true, new: true, session }
      );

      // ✅ Add printer reference to shop
      shop.printers = [printer._id];
      await shop.save({ session });

      await session.commitTransaction();
      
      res.status(201).json({ 
        success: true, 
        shopId: shop.shopId, 
        shopName: shop.shopName 
      });

    } catch (error: any) {
      await session.abortTransaction();
      console.error('Onboarding Error:', error);
      res.status(400).json({ error: error.message || 'Registration failed' });
    } finally {
      session.endSession();
    }
  });
 

  // Get shop printers (for frontend display)
router.post('/:shopId/printers', async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { shopId } = req.params;
    const { printers } = req.body;

    console.log('📤 Received printers for shop:', shopId);
    console.log('📦 Printer count:', printers?.length);

    if (!printers || !Array.isArray(printers)) {
      throw new Error('Printers array is required');
    }

    if (printers.length === 0) {
      throw new Error('No printers provided');
    }

    const shop = await Shop.findOne({ shopId }).session(session);
    if (!shop) {
      throw new Error('Shop not found');
    }

    const printerIds: mongoose.Types.ObjectId[] = [];

    // ✅ Save each printer to Printer collection
    for (const printerData of printers) {
      console.log('💾 Processing printer:', printerData.displayName);

      const printer = await Printer.findOneAndUpdate(
        { printerId: printerData.printerId },
        {
          shopId: shop._id,
          printerName: printerData.printerName,
          displayName: printerData.displayName,
          capabilities: {
            supportsColor: Boolean(printerData.capabilities.supportsColor),
            supportsDuplex: Boolean(printerData.capabilities.supportsDuplex),
            paperSizes: printerData.capabilities.paperSizes || ['A4'],
            maxPaperSize: printerData.capabilities.maxPaperSize || 'A4',
            isDefault: Boolean(printerData.capabilities.isDefault)
          },
          status: printerData.status || 'online',
          lastHeartbeat: new Date(),
          systemInfo: {
            os: printerData.systemInfo?.os || 'unknown',
            hostname: printerData.systemInfo?.hostname || 'unknown',
            driverVersion: printerData.systemInfo?.driverVersion || 'unknown',
            model: printerData.systemInfo?.model || 'unknown'
          }
        },
        { upsert: true, new: true, session }
      );

      printerIds.push(printer._id);
      console.log('✅ Printer saved:', printer.displayName);
    }

    // ✅ Update shop with printer references (ObjectIds)
    shop.printers = printerIds;
    await shop.save({ session });

    await session.commitTransaction();

    console.log(`✅ Updated ${printerIds.length} printers for shop ${shopId}`);

    res.json({
      success: true,
      message: 'Printers updated successfully',
      count: printerIds.length
    });

  } catch (error: any) {
    await session.abortTransaction();
    console.error('❌ Update printers error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  } finally {
    session.endSession();
  }
});
// backend/src/routes/shops.ts
// Get history jobs (ycompleted + failed) for a shop
router.get('/:shopId/jobs/history', async (req: Request, res: Response) => {
  try {
    const { shopId } = req.params;
    const { limit = 100 } = req.query;
    
    const shop = await Shop.findOne({ shopId });
    if (!shop) {
      return res.status(404).json({ 
        success: false, 
        error: 'Shop not found' 
      });
    }
    
    const jobs = await PrintJob.find({
      shopId: shop._id,
      status: { $in: ['completed', 'failed', 'cancelled'] }
    })
    .sort({ 'timestamps.created': -1 })
    .limit(Number(limit))
    .populate('userId', 'email name')
    .populate('printerId', 'printerName displayName');
    
    const formattedJobs = jobs.map(job => {
      const printer = job.printerId as any;
      const user = job.userId as any;
      return {
        _id: job._id.toString(),
        jobNumber: job.jobNumber,
        fileName: job.fileName,
        fileKey: job.fileKey,
        printerName: printer?.displayName || printer?.printerName || 'Default Printer',
        shopId: shopId,
        userName: user?.name || user?.email || 'Unknown User',
        status: job.status,
        settings: job.settings,
        estimatedCost: job.estimatedCost,
        timestamps: job.timestamps
      };
    });
        console.log(`✅ Fetched ${formattedJobs.length} history jobs for shop ${shopId}`);

    res.json({
      success: true,
      jobs: formattedJobs,
      count: formattedJobs.length
    });
    
    console.log(`✅ Sent ${formattedJobs.length} history jobs for shop ${shopId}`);
  } catch (error: any) {
    console.error('❌ Failed to fetch history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch history'
    });
  }
});


// ✅ Get pending jobs for a shop (for Electron app sync)
router.get('/:shopId/jobs/pending', async (req: Request, res: Response) => {
  try {
    const { shopId } = req.params;
    
    const shop = await Shop.findOne({ shopId });
    if (!shop) {
      return res.status(404).json({ 
        success: false, 
        error: 'Shop not found' 
      });
    }
    
    const jobs = await PrintJob.find({
      shopId: shop._id,
      status: { $in: ['pending', 'printing','failed','cancelled'] }
    })
    .sort({ 'timestamps.created': -1 })
    .populate('userId', 'email')
    .populate('printerId', 'printerName displayName')
    
    // ✅ Format jobs for Electron app
 const formattedJobs = jobs.map(job => {
      const printer = job.printerId as any;
      return {
        _id: job._id.toString(),
        jobNumber: job.jobNumber,
        fileName: job.fileName,
        fileKey: job.fileKey,
        printerName: printer?.printerName || printer?.displayName || 'Default Printer',
        shopId: shopId,
        status: job.status,
        settings: job.settings,
        estimatedCost: job.estimatedCost,
        timestamps: job.timestamps
      };
    });
    
    res.json({
      success: true,
      jobs: formattedJobs,
      count: formattedJobs.length
    });
    
    console.log(`✅ Sent ${formattedJobs.length} pending jobs to shop ${shopId}`);
  } catch (error: any) {
    console.error('❌ Failed to fetch pending jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs'
    });
  }
});
// backend/src/routes/shops.ts
router.get('/:shopId/printers', async (req: Request, res: Response) => {
  try {
    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId }).populate('printers');
    
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    let printers: any[] = [];

    // ✅ Check if printers are embedded or referenced
    if (shop.printers && Array.isArray(shop.printers) && shop.printers.length > 0) {
      // Check if it's a populated reference (has _id field)
      if (shop.printers[0]._id) {
        // It's a reference - already populated
        printers = shop.printers;
      } else {
        // It's embedded - use as is
        printers = shop.printers;
      }
    } else {
      // ✅ Fallback: Query Printer collection directly
      printers = await Printer.find({ shopId: shop._id }).select(
        'printerId printerName displayName capabilities pricing status systemInfo'
      );
    }

    // ✅ Format response with shop-level pricing fallback
    const formattedPrinters = printers.map(printer => ({
      _id: printer._id,
      printerId: printer.printerId,
      printerName: printer.printerName,
      displayName: printer.displayName,
      capabilities: printer.capabilities,
      // ✅ Use printer's pricing if available, otherwise use shop's pricing
      pricing: {
        // bwPerPage: printer.pricing?.bwPerPage || shop.pricing?.bwPerPage || 5,
        // colorPerPage: printer.pricing?.colorPerPage || shop.pricing?.colorPerPage || 10
        bwPerPage:  shop.pricing?.bwPerPage || 5,
        colorPerPage: shop.pricing?.colorPerPage || 10
      },
      status: printer.status,
      systemInfo: printer.systemInfo
    }));

    console.log(`✅ Fetched ${formattedPrinters.length} printers for shop ${shopId}`);
    
    res.json(formattedPrinters);
  } catch (error: any) {
    console.error('❌ Get printers error:', error);
    res.status(500).json({ error: error.message });
  }
});
router.get('/', async (req: Request, res: Response) => {
  try {
    const shops = await Shop.find({ status: 'active' })
      .select('shopId shopName location status')
      .sort({ shopName: 1 });
    
    res.json(shops);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shops' });
  }
});
  router.get('/:shopId', async (req: Request, res: Response) => {
    try {
      const shop = await Shop.findOne({ shopId: req.params.shopId });
      
      if (!shop) {
        return res.status(404).json({ error: 'Shop not found' });
      }

      res.json(shop);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch shop' });
    }
  });

  export default router;
