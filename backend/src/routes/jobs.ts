// backend/src/routes/jobs.ts
import { Router, Request, Response } from 'express';
import PrintJob from '../models/PrintJob';
import Shop from '../models/Shop';
import Printer from '../models/Printer';
import { nanoid } from 'nanoid';
import mongoose from 'mongoose';
import Counter from '../models/Counter';
import { authMiddleware,AuthRequest } from '../middleware/auth';

const router = Router();
async function getNextSequence(name: string): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

// ✅ Generate queue number: PRT-001, PRT-002, etc.
async function generateJobNumber(): Promise<string> {
  const seq = await getNextSequence('jobNumber');
  return `PRT-${String(seq).padStart(4, '0')}`; // PRT-0001, PRT-0002...
}
// ✅ Create job (single route, no duplicate)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    console.log('📥 Creating job with payload:', JSON.stringify(req.body, null, 2));
    
    const { userId, shopId, printerId, printerName, ...rest } = req.body;
    
    const shop = await Shop.findOne({ shopId });
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    
    // ✅ Find printer to get name if not provided
    const printer = await Printer.findOne({ 
      $or: [
        { printerId },
        { _id: mongoose.Types.ObjectId.isValid(printerId) ? printerId : null }
      ]
    });
    
    if (!printer) {
      return res.status(404).json({ error: 'Printer not found' });
    }
    
    // const jobNumber = `PRT-${nanoid(4).toUpperCase()}`;
    const jobNumber = await generateJobNumber();

    // ✅ Create job with printer name
    const job = await PrintJob.create({
      ...rest,
      userId: new mongoose.Types.ObjectId(userId),
      shopId: shop._id,
      printerId: printer._id,
      printerName: printerName || printer.printerName || printer.displayName, // ✅ Use provided or fetch from printer
      jobNumber,
      status: 'pending',
      timestamps: {
        created: new Date()
      }
    });

    console.log('✅ Job created:', {
      jobId: job._id,
      jobNumber: job.jobNumber,
      printerName: job.printerName
    });

    // ✅ Notify with complete job object
    const { notifyShop } = await import('../server');
    const jobData = {
      ...job.toObject(),
      _id: job._id.toString(),
      shopId: shopId // Use original shopId string for WebSocket
    };
    notifyShop(shopId, jobData);

    res.json({ jobNumber, jobId: job._id });
  } catch (error: any) {
    console.error('❌ Create job error:', error);
    res.status(500).json({ 
      error: 'Failed to create job',
      details: error.message
    });
  }
});

// ✅ Get job by ID (for tracking page)
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, } = req;
        if (!userId) {
      return res.status(401).json({ error: 'assadasdaUnauthorized' });
    }
    let job;
    
    if (mongoose.Types.ObjectId.isValid(id)) {
      job = await PrintJob.findById(id)
        .populate('shopId', 'shopName location')
        .populate('printerId', 'printerName displayName');
    } else {
      job = await PrintJob.findOne({ jobNumber: id })
        .populate('shopId', 'shopName location')
        .populate('printerId', 'printerName displayName');
    }
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(job);
  } catch (error: any) {
    console.error('❌ Get job error:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// ✅ Get jobs by user
router.get('/user/:userId',authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
        const requestedUserId = req.params.userId;
    const authenticatedUserId = req.userId;

    if (requestedUserId !== authenticatedUserId) {
      return res.status(403).json({ error: 'Forbidden: Access denied' });
    }
    const jobs = await PrintJob.find({ userId: req.params.userId })
      .sort({ 'timestamps.created': -1 })
      .populate('shopId', 'shopName')
      .populate('printerId', 'displayName');
    
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// ✅ Get jobs by shop
router.get('/shop/:shopId', authMiddleware,async (req: AuthRequest, res: Response) => {
  try {
    const requestedShopId = req.params.shopId;
    const userShopId = req.userShopId;   
    
    if (!userShopId) {
      return res.status(401).json({ error: 'Unauthorized: No shop info available' });
    }

    // Only allow access if user's shop matches requested shop
    if (requestedShopId !== userShopId) {
      return res.status(403).json({ error: 'Forbidden: Access denied' });
    }
    const shop = await Shop.findOne({ shopId: req.params.shopId });
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    
    const jobs = await PrintJob.find({ shopId: shop._id })
      .sort({ 'timestamps.created': -1 })
      .populate('userId', 'email')
      .populate('printerId', 'displayName');
    
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// ✅ Update job status
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    const jobId = req.params.id;
    const userId = req.userId!;
    const userShopId = req.userShopId!;

    const job = await PrintJob.findById(jobId).populate('shopId').exec();
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Authorization: must belong to user or user's shop
    const jobShopId = (job.shopId as any).shopId || (job.shopId as any)._id.toString();
    const jobUserId = job.userId.toString();

    if (jobShopId !== userShopId && jobUserId !== userId) {
      return res.status(403).json({ error: 'Forbidden: Not allowed to update this job' });
    }

    const update: any = { status, 'timestamps.updated': new Date() };

    if (status === 'printing') {
      update['timestamps.printStarted'] = new Date();
    } else if (status === 'completed') {
      update['timestamps.completed'] = new Date();
    }

    const updatedJob = await PrintJob.findByIdAndUpdate(jobId, update, { new: true });

    res.json({ success: true, job: updatedJob });
  } catch (error: any) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// ✅ Cancel job
router.patch('/:id/cancel', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.userId!;
    const userShopId = req.userShopId!;

    const job = await PrintJob.findById(jobId).populate('shopId').exec();
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if ((job.shopId as any).shopId !== userShopId && job.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Forbidden: Not allowed to cancel this job' });
    }

    const updatedJob = await PrintJob.findByIdAndUpdate(jobId, 
      { status: 'cancelled', 'timestamps.updated': new Date() }, 
      { new: true });

    res.json({ success: true, job: updatedJob });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});


export default router;
