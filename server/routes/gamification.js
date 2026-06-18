const express = require('express');
const User = require('../models/User');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');
const { BADGES } = require('../utils/emissionFactors');

const router = express.Router();

// @route   GET /api/gamification/badges
// @desc    Get user badges and available badges
router.get('/badges', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const earnedBadgeIds = user.badges.map(b => b.badgeId);

    const allBadges = BADGES.map(badge => ({
      ...badge,
      earned: earnedBadgeIds.includes(badge.id),
      earnedAt: user.badges.find(b => b.badgeId === badge.id)?.earnedAt || null
    }));

    res.json({
      earned: allBadges.filter(b => b.earned),
      available: allBadges.filter(b => !b.earned),
      total: BADGES.length,
      earnedCount: earnedBadgeIds.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/gamification/leaderboard
// @desc    Get top users by carbon saved
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get all users with their recent emission totals
    const leaderboard = await Activity.aggregate([
      { $match: { date: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$userId',
          totalEmissions: { $sum: '$carbonEmission' },
          activityCount: { $sum: 1 }
        }
      },
      { $sort: { totalEmissions: 1 } }, // Lower is better
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          name: '$user.name',
          avatar: '$user.avatar',
          totalEmissions: { $round: ['$totalEmissions', 2] },
          activityCount: 1,
          streak: '$user.streak.current',
          badgeCount: { $size: '$user.badges' }
        }
      }
    ]);

    // Add rank
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

    // Find current user's rank
    const userRank = rankedLeaderboard.find(e => e._id.toString() === req.user._id.toString());

    res.json({
      leaderboard: rankedLeaderboard,
      userRank: userRank?.rank || null
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/gamification/streak
// @desc    Get current streak info
router.get('/streak', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      current: user.streak.current,
      longest: user.streak.longest,
      lastActiveDate: user.streak.lastActiveDate
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
