import express from 'express';
import PrintJob from '../models/PrintJob';

const router = express.Router();

/**
 * GET /api/admin/analytics
 * Returns: Global stats + Per-shop breakdown for a specific date range
 */
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and End dates are required' });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    // Ensure end date covers the full day
    end.setHours(23, 59, 59, 999);

    // 1. Global Stats Aggregation
    const globalStats = await PrintJob.aggregate([
      { 
        $match: { 
          'timestamps.created': { $gte: start, $lte: end },
          status: 'completed'
        } 
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$estimatedCost' },
          totalJobs: { $sum: 1 },
          totalPages: { $sum: '$settings.totalPages' }
        }
      }
    ]);

    // 2. Per-Shop Performance Aggregation
    // This joins Jobs with Shops to get names, then groups by Shop
    const shopPerformance = await PrintJob.aggregate([
      { 
        $match: { 
          'timestamps.created': { $gte: start, $lte: end },
          status: 'completed'
        } 
      },
      {
        $group: {
          _id: '$shopId',
          revenue: { $sum: '$estimatedCost' },
          jobsCount: { $sum: 1 },
          averageOrderValue: { $avg: '$estimatedCost' }
        }
      },
      {
        $lookup: {
          from: 'shops', // Ensure this matches your actual MongoDB collection name (usually plural lowercase)
          localField: '_id',
          foreignField: '_id',
          as: 'shopDetails'
        }
      },
      { $unwind: '$shopDetails' },
      {
        $project: {
          shopId: '$_id',
          shopName: '$shopDetails.shopName',
          ownerName: '$shopDetails.ownerName',
          location: '$shopDetails.location',
          revenue: 1,
          jobsCount: 1,
          averageOrderValue: { $round: ['$averageOrderValue', 2] }
        }
      },
      { $sort: { revenue: -1 } } // Sort by highest revenue
    ]);

    res.json({
      global: globalStats[0] || { totalRevenue: 0, totalJobs: 0, totalPages: 0 },
      shops: shopPerformance
    });

  } catch (error) {
    console.error('Admin Analytics Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
