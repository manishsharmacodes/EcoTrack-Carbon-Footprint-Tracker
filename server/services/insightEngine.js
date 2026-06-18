const Activity = require('../models/Activity');
const { AVERAGE_DAILY_EMISSION } = require('../utils/emissionFactors');

/**
 * Generate personalized insights based on user activity data
 * Rule-based recommendation engine
 */
async function generateInsights(userId) {
  const insights = [];

  // Get last 30 days of activities
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const activities = await Activity.find({
    userId,
    date: { $gte: thirtyDaysAgo }
  });

  if (activities.length === 0) {
    insights.push({
      type: 'info',
      icon: '📝',
      title: 'Start Tracking',
      message: 'Log your first activity to get personalized insights about your carbon footprint!',
      impact: 'high',
      category: 'general'
    });
    return insights;
  }

  // Calculate category breakdowns
  const categoryTotals = {};
  let totalEmissions = 0;

  activities.forEach(a => {
    categoryTotals[a.category] = (categoryTotals[a.category] || 0) + a.carbonEmission;
    totalEmissions += a.carbonEmission;
  });

  const dailyAvg = totalEmissions / 30;

  // --- Rule 1: Transport dominance ---
  if (categoryTotals.transport && categoryTotals.transport / totalEmissions > 0.5) {
    insights.push({
      type: 'suggestion',
      icon: '🚌',
      title: 'Reduce Car Usage',
      message: `Transportation accounts for ${Math.round(categoryTotals.transport / totalEmissions * 100)}% of your emissions. Consider carpooling, public transport, or cycling for shorter trips.`,
      impact: 'high',
      category: 'transport',
      potential: Math.round(categoryTotals.transport * 0.3)
    });
  }

  // --- Rule 2: High non-veg consumption ---
  const foodActivities = activities.filter(a => a.category === 'food');
  const nonVegMeals = foodActivities.filter(a => a.subcategory === 'non_veg').length;
  if (foodActivities.length > 0 && nonVegMeals / foodActivities.length > 0.7) {
    insights.push({
      type: 'suggestion',
      icon: '🥗',
      title: 'Try Meatless Days',
      message: `${Math.round(nonVegMeals / foodActivities.length * 100)}% of your meals are non-vegetarian. Trying Meatless Mondays could save ~90 kg CO₂ per year.`,
      impact: 'medium',
      category: 'food',
      potential: 90
    });
  }

  // --- Rule 3: High electricity usage ---
  if (categoryTotals.electricity && categoryTotals.electricity > 150) {
    insights.push({
      type: 'suggestion',
      icon: '⚡',
      title: 'Reduce Energy Consumption',
      message: `Your electricity emissions are ${Math.round(categoryTotals.electricity)} kg CO₂ this month. Switch to LED bulbs, unplug idle devices, and consider energy-efficient appliances.`,
      impact: 'high',
      category: 'electricity',
      potential: Math.round(categoryTotals.electricity * 0.25)
    });
  }

  // --- Rule 4: Shopping emissions ---
  if (categoryTotals.shopping && categoryTotals.shopping > 50) {
    insights.push({
      type: 'suggestion',
      icon: '🛍️',
      title: 'Mindful Shopping',
      message: `Your shopping emissions are ${Math.round(categoryTotals.shopping)} kg CO₂. Consider buying second-hand, repairing items, or reducing impulse purchases.`,
      impact: 'medium',
      category: 'shopping',
      potential: Math.round(categoryTotals.shopping * 0.4)
    });
  }

  // --- Rule 5: Week-over-week improvement ---
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const thisWeek = activities
    .filter(a => a.date >= sevenDaysAgo)
    .reduce((sum, a) => sum + a.carbonEmission, 0);
  const lastWeek = activities
    .filter(a => a.date >= fourteenDaysAgo && a.date < sevenDaysAgo)
    .reduce((sum, a) => sum + a.carbonEmission, 0);

  if (lastWeek > 0 && thisWeek < lastWeek) {
    const reduction = Math.round((1 - thisWeek / lastWeek) * 100);
    insights.push({
      type: 'achievement',
      icon: '📉',
      title: 'Great Progress!',
      message: `You reduced your emissions by ${reduction}% compared to last week. Keep up the fantastic work!`,
      impact: 'positive',
      category: 'general'
    });
  } else if (lastWeek > 0 && thisWeek > lastWeek * 1.2) {
    insights.push({
      type: 'warning',
      icon: '📈',
      title: 'Emissions Increasing',
      message: `Your emissions are ${Math.round((thisWeek / lastWeek - 1) * 100)}% higher than last week. Review your recent activities for areas to improve.`,
      impact: 'high',
      category: 'general'
    });
  }

  // --- Rule 6: Comparison to average ---
  if (dailyAvg < AVERAGE_DAILY_EMISSION) {
    insights.push({
      type: 'achievement',
      icon: '🌟',
      title: 'Below Average',
      message: `Your daily average is ${dailyAvg.toFixed(1)} kg CO₂, which is ${Math.round((1 - dailyAvg / AVERAGE_DAILY_EMISSION) * 100)}% below the global average of ${AVERAGE_DAILY_EMISSION} kg. Amazing!`,
      impact: 'positive',
      category: 'general'
    });
  } else {
    insights.push({
      type: 'info',
      icon: '🌍',
      title: 'Room for Improvement',
      message: `Your daily average is ${dailyAvg.toFixed(1)} kg CO₂, which is ${Math.round((dailyAvg / AVERAGE_DAILY_EMISSION - 1) * 100)}% above the global average. Focus on your highest-emission categories to bring this down.`,
      impact: 'medium',
      category: 'general'
    });
  }

  // --- Rule 7: Green transport encouragement ---
  const greenTrips = activities.filter(a =>
    a.category === 'transport' && (a.subcategory === 'bike' || a.subcategory === 'walk')
  ).length;
  if (greenTrips > 0) {
    insights.push({
      type: 'achievement',
      icon: '🚲',
      title: 'Eco-Friendly Commuter',
      message: `You\'ve logged ${greenTrips} zero-emission trips this month! Each one helps reduce air pollution and keeps you healthy.`,
      impact: 'positive',
      category: 'transport'
    });
  }

  return insights;
}

module.exports = { generateInsights };
