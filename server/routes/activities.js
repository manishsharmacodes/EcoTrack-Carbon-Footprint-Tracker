const express = require('express');
const { body, validationResult } = require('express-validator');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');
const { calculateEmission } = require('../services/emissionCalculator');
const { checkAndAwardBadges, updateStreak } = require('../services/badgeService');

const router = express.Router();

// @route   POST /api/activities
// @desc    Log a new activity
router.post('/', auth, [
  body('category').isIn(['transport', 'electricity', 'food', 'shopping']),
  body('subcategory').notEmpty(),
  body('date').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category, subcategory, details, date } = req.body;

    // Calculate carbon emission
    const carbonEmission = calculateEmission(category, subcategory, details || {});

    const activity = new Activity({
      userId: req.user._id,
      date: date || new Date(),
      category,
      subcategory,
      details: details || {},
      carbonEmission
    });

    await activity.save();

    // Update streak and check badges
    await updateStreak(req.user._id);
    const newBadges = await checkAndAwardBadges(req.user._id);

    res.status(201).json({
      activity,
      newBadges,
      message: `Activity logged: ${carbonEmission} kg CO₂`
    });
  } catch (error) {
    console.error('Activity creation error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   GET /api/activities
// @desc    Get user activities with optional date filters
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate, category, limit = 50, page = 1 } = req.query;
    const query = { userId: req.user._id };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (category) query.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .sort({ date: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      Activity.countDocuments(query)
    ]);

    res.json({
      activities,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/activities/summary
// @desc    Get emissions summary
router.get('/summary', auth, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [daily, weekly, monthly] = await Promise.all([
      Activity.aggregate([
        { $match: { userId: req.user._id, date: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: '$carbonEmission' }, count: { $sum: 1 } } }
      ]),
      Activity.aggregate([
        { $match: { userId: req.user._id, date: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: '$carbonEmission' }, count: { $sum: 1 } } }
      ]),
      Activity.aggregate([
        { $match: { userId: req.user._id, date: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$carbonEmission' }, count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      daily: { total: daily[0]?.total || 0, count: daily[0]?.count || 0 },
      weekly: { total: weekly[0]?.total || 0, count: weekly[0]?.count || 0 },
      monthly: { total: monthly[0]?.total || 0, count: monthly[0]?.count || 0 }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/activities/:id
// @desc    Delete an activity
router.delete('/:id', auth, async (req, res) => {
  try {
    const activity = await Activity.findOne({ _id: req.params.id, userId: req.user._id });
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }
    await activity.deleteOne();
    res.json({ message: 'Activity deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
