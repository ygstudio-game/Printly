import { Router, Request, Response } from 'express';
import Printer from '../models/Printer';

const router = Router();

// Register printer
router.post('/', async (req: Request, res: Response) => {
  try {
    const printer = await Printer.create(req.body);
    res.json({ printerId: printer._id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register printer' });
  }
});

// Update heartbeat
router.patch('/:id/heartbeat', async (req: Request, res: Response) => {
  try {
    await Printer.findByIdAndUpdate(req.params.id, {
      lastHeartbeat: new Date(),
      status: 'online'
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update heartbeat' });
  }
});

export default router;
