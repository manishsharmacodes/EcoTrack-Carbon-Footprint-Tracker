const express = require('express');
const { body, validationResult } = require('express-validator');
const Goal = require('../models/Goal');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/goals
// @desc    Create a new goal
router.post('/', auth, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('targetReduction').isFloat({ min: 1, max: 100 }),
  body('endDate').isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, category, targetReduction, endDate } = req.body;

    // Calculate baseline from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const query = { userId: req.user._id, date: { $gte: thirtyDaysAgo } };
    if (category && category !== 'overall') {
      query.category = category;
    }

    const baseline = await Activity.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$carbonEmission' } } }
    ]);

    const baselineEmission = baseline[0]?.total || 100;

    const goal = new Goal({
      userId: req.user._id,
      title,
      description: description || '',
      category: category || 'overall',
      targetReduction,
      baselineEmission,
      startDate: new Date(),
      endDate: new Date(endDate)
    });

    await goal.save();
    res.status(201).json(goal);
  } catch (error) {
    console.error('Goal creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/goals
// @desc    Get all user goals
router.get('/', auth, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user._id }).sort({ createdAt: -1 });

    // Update progress for active goals
    const updatedGoals = await Promise.all(goals.map(async (goal) => {
      if (goal.status === 'active') {
        const query = { userId: req.user._id, date: { $gte: goal.startDate } };
        if (goal.category !== 'overall') {
          query.category = goal.category;
        }

        const result = await Activity.aggregate([
          { $match: query },
          { $group: { _id: null, total: { $sum: '$carbonEmission' } } }
        ]);

        const currentEmission = result[0]?.total || 0;
        const targetEmission = goal.baselineEmission * (1 - goal.targetReduction / 100);
        const reduction = goal.baselineEmission > 0 
          ? ((goal.baselineEmission - currentEmission) / goal.baselineEmission) * 100 
          : 0;

        goal.currentEmission = currentEmission;
        goal.progress = Math.min(100, Math.max(0, Math.round((reduction / goal.targetReduction) * 100)));

        // Check if goal completed or failed
        if (goal.progress >= 100) {
          goal.status = 'completed';
        } else if (new Date() > goal.endDate) {
          goal.status = 'failed';
        }

        await goal.save();
      }
      return goal;
    }));

    res.json(updatedGoals);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/goals/:id
// @desc    Update a goal
router.put('/:id', auth, async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    const { title, description, targetReduction, endDate, status } = req.body;
    if (title) goal.title = title;
    if (description !== undefined) goal.description = description;
    if (targetReduction) goal.targetReduction = targetReduction;
    if (endDate) goal.endDate = new Date(endDate);
    if (status) goal.status = status;

    await goal.save();
    res.json(goal);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/goals/:id
// @desc    Delete a goal
router.delete('/:id', auth, async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    res.json({ message: 'Goal deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
