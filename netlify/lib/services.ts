import { and, count, eq, gte, inArray, lt, sql, sum } from "drizzle-orm";
import { db } from "../../db/index.js";
import { activities, goals, notifications, users } from "../../db/schema.js";
import { EMISSION_FACTORS, AVERAGE_DAILY_EMISSION, BADGES } from "./emissionFactors.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calculate carbon emission (kg CO₂) for a given activity
 */
export function calculateEmission(category: string, subcategory: string, details: Record<string, any>) {
  const factors = (EMISSION_FACTORS as Record<string, Record<string, { factor: number }>>)[category];
  if (!factors || !factors[subcategory]) {
    throw new Error(`Unknown activity: ${category}/${subcategory}`);
  }

  const { factor } = factors[subcategory];
  let quantity = 0;

  switch (category) {
    case "transport":
      quantity = Number(details.distance) || 0;
      break;
    case "electricity":
      quantity = Number(details.quantity) || 0; // kWh
      break;
    case "food":
    case "shopping":
      quantity = Number(details.quantity) || 1; // meals / items
      break;
    default:
      quantity = Number(details.quantity) || 0;
  }

  return Math.round(factor * quantity * 100) / 100;
}

/**
 * Get carbon score level based on daily emissions
 */
export function getCarbonScore(dailyEmission: number) {
  if (dailyEmission < 8) {
    return { level: "low", label: "Low", color: "#22c55e", score: Math.max(0, 100 - dailyEmission * 6) };
  } else if (dailyEmission < 20) {
    return { level: "medium", label: "Medium", color: "#f59e0b", score: Math.max(20, 70 - (dailyEmission - 8) * 3) };
  }
  return { level: "high", label: "High", color: "#ef4444", score: Math.max(0, 30 - (dailyEmission - 20)) };
}

/**
 * Sum emissions (and count activities) for a user matching extra conditions
 */
export async function sumEmissions(userId: string, ...conditions: any[]) {
  const [row] = await db
    .select({ total: sum(activities.carbonEmission).mapWith(Number), count: count() })
    .from(activities)
    .where(and(eq(activities.userId, userId), ...conditions));
  return { total: row?.total || 0, count: row?.count || 0 };
}

async function countActivities(userId: string, ...conditions: any[]) {
  return (await sumEmissions(userId, ...conditions)).count;
}

async function reductionPercent(userId: string, ...conditions: any[]) {
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * DAY_MS);
  const sixtyDaysAgo = new Date(now - 60 * DAY_MS);

  const recent = await sumEmissions(userId, gte(activities.date, thirtyDaysAgo), ...conditions);
  const previous = await sumEmissions(
    userId,
    gte(activities.date, sixtyDaysAgo),
    lt(activities.date, thirtyDaysAgo),
    ...conditions
  );

  if (previous.total === 0) return null;
  return ((previous.total - recent.total) / previous.total) * 100;
}

async function checkBadgeCriteria(user: typeof users.$inferSelect, badge: any) {
  const { type, value } = badge.criteria;

  switch (type) {
    case "activity_count":
      return (await countActivities(user.id)) >= value;

    case "streak":
      return user.streakCurrent >= value;

    case "green_transport":
      return (
        (await countActivities(
          user.id,
          eq(activities.category, "transport"),
          inArray(activities.subcategory, ["bike", "walk"])
        )) >= value
      );

    case "veggie_meals":
      return (
        (await countActivities(
          user.id,
          eq(activities.category, "food"),
          inArray(activities.subcategory, ["vegetarian", "vegan"])
        )) >= value
      );

    case "electricity_reduction": {
      const reduction = await reductionPercent(user.id, eq(activities.category, "electricity"));
      return reduction !== null && reduction >= value;
    }

    case "total_reduction": {
      const reduction = await reductionPercent(user.id);
      return reduction !== null && reduction >= value;
    }

    case "goals_completed": {
      const [row] = await db
        .select({ count: count() })
        .from(goals)
        .where(and(eq(goals.userId, user.id), eq(goals.status, "completed")));
      return (row?.count || 0) >= value;
    }

    case "low_score_days": {
      // Number of days in the last 30 with total emissions under 8 kg
      const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS);
      const day = sql`date_trunc('day', ${activities.date} at time zone 'UTC')`;
      const rows = await db
        .select({ day })
        .from(activities)
        .where(and(eq(activities.userId, user.id), gte(activities.date, thirtyDaysAgo)))
        .groupBy(day)
        .having(sql`sum(${activities.carbonEmission}) < 8`);
      return rows.length >= value;
    }

    default:
      return false;
  }
}

/**
 * Check and award badges based on user activity. Returns newly earned badges.
 */
export async function checkAndAwardBadges(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return [];

  const earnedBadgeIds = user.badges.map((b) => b.badgeId);
  const badges = [...user.badges];
  const newBadges: any[] = [];

  for (const badge of BADGES as any[]) {
    if (earnedBadgeIds.includes(badge.id)) continue;

    if (await checkBadgeCriteria(user, badge)) {
      badges.push({ badgeId: badge.id, earnedAt: new Date().toISOString() });
      newBadges.push(badge);

      await db.insert(notifications).values({
        userId,
        type: "achievement",
        title: `Badge Earned: ${badge.name}`,
        message: `${badge.icon} Congratulations! You earned the "${badge.name}" badge — ${badge.description}`,
        icon: badge.icon,
      });
    }
  }

  if (newBadges.length > 0) {
    await db.update(users).set({ badges, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  return newBadges;
}

/**
 * Update user's daily logging streak
 */
export async function updateStreak(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let current = user.streakCurrent;
  let longest = user.streakLongest;

  if (user.lastActiveDate) {
    const lastActive = new Date(user.lastActiveDate);
    lastActive.setUTCHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / DAY_MS);

    if (diffDays === 0) return; // Same day, no update needed
    current = diffDays === 1 ? current + 1 : 1;
  } else {
    current = 1;
  }
  longest = Math.max(longest, current);

  await db
    .update(users)
    .set({ streakCurrent: current, streakLongest: longest, lastActiveDate: today, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

/**
 * Generate personalized insights based on the last 30 days of activity.
 * Rule-based recommendation engine.
 */
export async function generateInsights(userId: string) {
  const insights: any[] = [];
  const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS);

  const recent = await db
    .select()
    .from(activities)
    .where(and(eq(activities.userId, userId), gte(activities.date, thirtyDaysAgo)));

  if (recent.length === 0) {
    insights.push({
      type: "info",
      icon: "📝",
      title: "Start Tracking",
      message: "Log your first activity to get personalized insights about your carbon footprint!",
      impact: "high",
      category: "general",
    });
    return insights;
  }

  const categoryTotals: Record<string, number> = {};
  let totalEmissions = 0;
  recent.forEach((a) => {
    categoryTotals[a.category] = (categoryTotals[a.category] || 0) + a.carbonEmission;
    totalEmissions += a.carbonEmission;
  });

  const dailyAvg = totalEmissions / 30;

  // --- Rule 1: Transport dominance ---
  if (categoryTotals.transport && categoryTotals.transport / totalEmissions > 0.5) {
    insights.push({
      type: "suggestion",
      icon: "🚌",
      title: "Reduce Car Usage",
      message: `Transportation accounts for ${Math.round((categoryTotals.transport / totalEmissions) * 100)}% of your emissions. Consider carpooling, public transport, or cycling for shorter trips.`,
      impact: "high",
      category: "transport",
      potential: Math.round(categoryTotals.transport * 0.3),
    });
  }

  // --- Rule 2: High non-veg consumption ---
  const foodActivities = recent.filter((a) => a.category === "food");
  const nonVegMeals = foodActivities.filter((a) => a.subcategory === "non_veg").length;
  if (foodActivities.length > 0 && nonVegMeals / foodActivities.length > 0.7) {
    insights.push({
      type: "suggestion",
      icon: "🥗",
      title: "Try Meatless Days",
      message: `${Math.round((nonVegMeals / foodActivities.length) * 100)}% of your meals are non-vegetarian. Trying Meatless Mondays could save ~90 kg CO₂ per year.`,
      impact: "medium",
      category: "food",
      potential: 90,
    });
  }

  // --- Rule 3: High electricity usage ---
  if (categoryTotals.electricity && categoryTotals.electricity > 150) {
    insights.push({
      type: "suggestion",
      icon: "⚡",
      title: "Reduce Energy Consumption",
      message: `Your electricity emissions are ${Math.round(categoryTotals.electricity)} kg CO₂ this month. Switch to LED bulbs, unplug idle devices, and consider energy-efficient appliances.`,
      impact: "high",
      category: "electricity",
      potential: Math.round(categoryTotals.electricity * 0.25),
    });
  }

  // --- Rule 4: Shopping emissions ---
  if (categoryTotals.shopping && categoryTotals.shopping > 50) {
    insights.push({
      type: "suggestion",
      icon: "🛍️",
      title: "Mindful Shopping",
      message: `Your shopping emissions are ${Math.round(categoryTotals.shopping)} kg CO₂. Consider buying second-hand, repairing items, or reducing impulse purchases.`,
      impact: "medium",
      category: "shopping",
      potential: Math.round(categoryTotals.shopping * 0.4),
    });
  }

  // --- Rule 5: Week-over-week change ---
  const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS);
  const fourteenDaysAgo = new Date(Date.now() - 14 * DAY_MS);
  const thisWeek = recent.filter((a) => a.date >= sevenDaysAgo).reduce((s, a) => s + a.carbonEmission, 0);
  const lastWeek = recent
    .filter((a) => a.date >= fourteenDaysAgo && a.date < sevenDaysAgo)
    .reduce((s, a) => s + a.carbonEmission, 0);

  if (lastWeek > 0 && thisWeek < lastWeek) {
    insights.push({
      type: "achievement",
      icon: "📉",
      title: "Great Progress!",
      message: `You reduced your emissions by ${Math.round((1 - thisWeek / lastWeek) * 100)}% compared to last week. Keep up the fantastic work!`,
      impact: "positive",
      category: "general",
    });
  } else if (lastWeek > 0 && thisWeek > lastWeek * 1.2) {
    insights.push({
      type: "warning",
      icon: "📈",
      title: "Emissions Increasing",
      message: `Your emissions are ${Math.round((thisWeek / lastWeek - 1) * 100)}% higher than last week. Review your recent activities for areas to improve.`,
      impact: "high",
      category: "general",
    });
  }

  // --- Rule 6: Comparison to average ---
  if (dailyAvg < AVERAGE_DAILY_EMISSION) {
    insights.push({
      type: "achievement",
      icon: "🌟",
      title: "Below Average",
      message: `Your daily average is ${dailyAvg.toFixed(1)} kg CO₂, which is ${Math.round((1 - dailyAvg / AVERAGE_DAILY_EMISSION) * 100)}% below the global average of ${AVERAGE_DAILY_EMISSION} kg. Amazing!`,
      impact: "positive",
      category: "general",
    });
  } else {
    insights.push({
      type: "info",
      icon: "🌍",
      title: "Room for Improvement",
      message: `Your daily average is ${dailyAvg.toFixed(1)} kg CO₂, which is ${Math.round((dailyAvg / AVERAGE_DAILY_EMISSION - 1) * 100)}% above the global average. Focus on your highest-emission categories to bring this down.`,
      impact: "medium",
      category: "general",
    });
  }

  // --- Rule 7: Green transport encouragement ---
  const greenTrips = recent.filter(
    (a) => a.category === "transport" && (a.subcategory === "bike" || a.subcategory === "walk")
  ).length;
  if (greenTrips > 0) {
    insights.push({
      type: "achievement",
      icon: "🚲",
      title: "Eco-Friendly Commuter",
      message: `You've logged ${greenTrips} zero-emission trips this month! Each one helps reduce air pollution and keeps you healthy.`,
      impact: "positive",
      category: "transport",
    });
  }

  return insights;
}
