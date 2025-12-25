// backend/src/routes/jobs.ts
import { Router, Request, Response } from 'express';
import PrintJob from '../models/PrintJob';
import Shop from '../models/Shop';
import Printer from '../models/Printer';
import { nanoid } from 'nanoid';
import mongoose from 'mongoose';
import Counter from '../models/Counter';

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
router.post('/', async (req: Request, res: Response) => {
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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
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
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
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
router.get('/shop/:shopId', async (req: Request, res: Response) => {
  try {
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
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    
    const update: any = { 
      status,
      'timestamps.updated': new Date()
    };
    
    if (status === 'printing') {
      update['timestamps.printStarted'] = new Date();
    } else if (status === 'completed') {
      update['timestamps.completed'] = new Date();
    }

    const job = await PrintJob.findByIdAndUpdate(
      req.params.id, 
      update,
      { new: true }
    );
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({ success: true, job });
  } catch (error: any) {
    console.error('❌ Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// ✅ Cancel job
router.patch('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const job = await PrintJob.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'cancelled',
        'timestamps.updated': new Date()
      },
      { new: true }
    );
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

export default router;
