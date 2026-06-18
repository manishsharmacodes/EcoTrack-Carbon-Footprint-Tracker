const User = require('../models/User');
const Activity = require('../models/Activity');
const Goal = require('../models/Goal');
const Notification = require('../models/Notification');
const { BADGES } = require('../utils/emissionFactors');

/**
 * Check and award badges based on user activity
 * @param {string} userId - User ID to check badges for
 * @returns {Array} Newly earned badges
 */
async function checkAndAwardBadges(userId) {
  const user = await User.findById(userId);
  if (!user) return [];

  const earnedBadgeIds = user.badges.map(b => b.badgeId);
  const newBadges = [];

  for (const badge of BADGES) {
    if (earnedBadgeIds.includes(badge.id)) continue;

    const earned = await checkBadgeCriteria(userId, user, badge);
    if (earned) {
      user.badges.push({ badgeId: badge.id, earnedAt: new Date() });
      newBadges.push(badge);

      // Create notification for badge
      await Notification.create({
        userId,
        type: 'achievement',
        title: `Badge Earned: ${badge.name}`,
        message: `${badge.icon} Congratulations! You earned the "${badge.name}" badge — ${badge.description}`,
        icon: badge.icon
      });
    }
  }

  if (newBadges.length > 0) {
    await user.save();
  }

  return newBadges;
}

/**
 * Check if a specific badge criteria is met
 */
async function checkBadgeCriteria(userId, user, badge) {
  const { type, value } = badge.criteria;

  switch (type) {
    case 'activity_count': {
      const count = await Activity.countDocuments({ userId });
      return count >= value;
    }

    case 'streak': {
      return user.streak.current >= value;
    }

    case 'green_transport': {
      const count = await Activity.countDocuments({
        userId,
        category: 'transport',
        subcategory: { $in: ['bike', 'walk'] }
      });
      return count >= value;
    }

    case 'veggie_meals': {
      const count = await Activity.countDocuments({
        userId,
        category: 'food',
        subcategory: { $in: ['vegetarian', 'vegan'] }
      });
      return count >= value;
    }

    case 'electricity_reduction': {
      // Compare last 30 days vs previous 30 days
      const now = new Date();
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);

      const recent = await Activity.aggregate([
        { $match: { userId: user._id, category: 'electricity', date: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$carbonEmission' } } }
      ]);

      const previous = await Activity.aggregate([
        { $match: { userId: user._id, category: 'electricity', date: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$carbonEmission' } } }
      ]);

      if (previous.length === 0 || previous[0].total === 0) return false;
      const reduction = ((previous[0].total - (recent[0]?.total || 0)) / previous[0].total) * 100;
      return reduction >= value;
    }

    case 'total_reduction': {
      const now = new Date();
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);

      const recent = await Activity.aggregate([
        { $match: { userId: user._id, date: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$carbonEmission' } } }
      ]);

      const previous = await Activity.aggregate([
        { $match: { userId: user._id, date: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$carbonEmission' } } }
      ]);

      if (previous.length === 0 || previous[0].total === 0) return false;
      const reduction = ((previous[0].total - (recent[0]?.total || 0)) / previous[0].total) * 100;
      return reduction >= value;
    }

    case 'goals_completed': {
      const count = await Goal.countDocuments({ userId, status: 'completed' });
      return count >= value;
    }

    case 'low_score_days': {
      // Simplified: check if average daily emission in last 30 days is low
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await Activity.aggregate([
        { $match: { userId: user._id, date: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, daily: { $sum: '$carbonEmission' } } },
        { $match: { daily: { $lt: 8 } } }
      ]);
      return result.length >= value;
    }

    default:
      return false;
  }
}

/**
 * Update user's login streak
 */
async function updateStreak(userId) {
  const user = await User.findById(userId);
  if (!user) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActive = user.streak.lastActiveDate
    ? new Date(user.streak.lastActiveDate)
    : null;

  if (lastActive) {
    lastActive.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - lastActive) / (24 * 60 * 60 * 1000));

    if (diffDays === 0) {
      // Same day, no update needed
      return user.streak;
    } else if (diffDays === 1) {
      // Consecutive day
      user.streak.current += 1;
      if (user.streak.current > user.streak.longest) {
        user.streak.longest = user.streak.current;
      }
    } else {
      // Streak broken
      user.streak.current = 1;
    }
  } else {
    user.streak.current = 1;
  }

  user.streak.lastActiveDate = today;
  await user.save();

  return user.streak;
}

module.exports = { checkAndAwardBadges, updateStreak };
