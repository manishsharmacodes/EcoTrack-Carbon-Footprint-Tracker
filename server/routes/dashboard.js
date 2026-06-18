const express = require('express');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');
const { getCarbonScore } = require('../services/emissionCalculator');
const { AVERAGE_DAILY_EMISSION } = require('../utils/emissionFactors');

const router = express.Router();

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics with carbon score
router.get('/stats', auth, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get today's total emissions
    const dailyResult = await Activity.aggregate([
      { $match: { userId: req.user._id, date: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$carbonEmission' } } }
    ]);

    const dailyEmission = dailyResult[0]?.total || 0;
    const carbonScore = getCarbonScore(dailyEmission);

    // Get monthly breakdown by category
    const categoryBreakdown = await Activity.aggregate([
      { $match: { userId: req.user._id, date: { $gte: monthStart } } },
      { $group: { _id: '$category', total: { $sum: '$carbonEmission' }, count: { $sum: 1 } } }
    ]);

    // Total activities count
    const totalActivities = await Activity.countDocuments({ userId: req.user._id });

    // Trees needed to offset (1 tree absorbs ~22 kg CO₂/year)
    const monthlyTotal = categoryBreakdown.reduce((sum, c) => sum + c.total, 0);
    const treesNeeded = Math.ceil((monthlyTotal * 12) / 22);

    res.json({
      dailyEmission: Math.round(dailyEmission * 100) / 100,
      carbonScore,
      categoryBreakdown: categoryBreakdown.map(c => ({
        category: c._id,
        total: Math.round(c.total * 100) / 100,
        count: c.count
      })),
      monthlyTotal: Math.round(monthlyTotal * 100) / 100,
      totalActivities,
      treesNeeded,
      averageComparison: {
        userDaily: Math.round(dailyEmission * 100) / 100,
        globalAverage: AVERAGE_DAILY_EMISSION,
        percentDiff: dailyEmission > 0 
          ? Math.round((dailyEmission / AVERAGE_DAILY_EMISSION - 1) * 100) 
          : -100
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/chart-data
// @desc    Get time-series data for charts
router.get('/chart-data', auth, async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;
    const now = new Date();
    let startDate;
    let groupFormat;

    switch (period) {
      case 'daily':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        groupFormat = '%H:00';
        break;
      case 'weekly':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        groupFormat = '%Y-%m-%d';
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        groupFormat = '%Y-%m-%d';
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        groupFormat = '%Y-%m';
        break;
      default:
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        groupFormat = '%Y-%m-%d';
    }

    const chartData = await Activity.aggregate([
      { $match: { userId: req.user._id, date: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: groupFormat, date: '$date' } },
            category: '$category'
          },
          total: { $sum: '$carbonEmission' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Restructure for frontend
    const dateMap = {};
    chartData.forEach(item => {
      const date = item._id.date;
      if (!dateMap[date]) {
        dateMap[date] = { date, transport: 0, electricity: 0, food: 0, shopping: 0, total: 0 };
      }
      dateMap[date][item._id.category] = Math.round(item.total * 100) / 100;
      dateMap[date].total += item.total;
    });

    // Round totals
    Object.values(dateMap).forEach(d => {
      d.total = Math.round(d.total * 100) / 100;
    });

    res.json(Object.values(dateMap));
  } catch (error) {
    console.error('Chart data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/progress
// @desc    Get category-wise progress breakdown
router.get('/progress', auth, async (req, res) => {
  try {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const prevMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);

    const [current, previous] = await Promise.all([
      Activity.aggregate([
        { $match: { userId: req.user._id, date: { $gte: monthStart } } },
        { $group: { _id: '$category', total: { $sum: '$carbonEmission' } } }
      ]),
      Activity.aggregate([
        { $match: { userId: req.user._id, date: { $gte: prevMonthStart, $lt: monthStart } } },
        { $group: { _id: '$category', total: { $sum: '$carbonEmission' } } }
      ])
    ]);

    const categories = ['transport', 'electricity', 'food', 'shopping'];
    const progress = categories.map(cat => {
      const curr = current.find(c => c._id === cat)?.total || 0;
      const prev = previous.find(c => c._id === cat)?.total || 0;
      const change = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;

      return {
        category: cat,
        current: Math.round(curr * 100) / 100,
        previous: Math.round(prev * 100) / 100,
        change,
        improved: change < 0
      };
    });

    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
