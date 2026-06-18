const express = require('express');
const auth = require('../middleware/auth');
const { generateInsights } = require('../services/insightEngine');
const { ECO_TIPS } = require('../utils/emissionFactors');

const router = express.Router();

// @route   GET /api/insights
// @desc    Get personalized insights
router.get('/', auth, async (req, res) => {
  try {
    const insights = await generateInsights(req.user._id);
    res.json(insights);
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/insights/tips
// @desc    Get eco tips of the day
router.get('/tips', auth, async (req, res) => {
  try {
    // Rotate tips based on date so users see different ones each day
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (24 * 60 * 60 * 1000));
    const tipIndex = dayOfYear % ECO_TIPS.length;

    // Return 3 tips starting from the daily index
    const tips = [];
    for (let i = 0; i < 3; i++) {
      tips.push(ECO_TIPS[(tipIndex + i) % ECO_TIPS.length]);
    }

    res.json(tips);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
