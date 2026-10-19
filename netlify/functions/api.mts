import type { Config } from "@netlify/functions";
import { and, asc, count, desc, eq, gte, lt, lte, sql, sum } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { db } from "../../db/index.js";
import { activities, appConfig, goals, notifications, users } from "../../db/schema.js";
import { AVERAGE_DAILY_EMISSION, BADGES, ECO_TIPS } from "../lib/emissionFactors.js";
import {
  calculateEmission,
  checkAndAwardBadges,
  generateInsights,
  getCarbonScore,
  sumEmissions,
  updateStreak,
} from "../lib/services.js";

type User = typeof users.$inferSelect;
type Ctx = { req: Request; url: URL; params: Record<string, string>; body: any; user: User };
type Handler = (ctx: Ctx) => Promise<Response> | Response;

const DAY_MS = 24 * 60 * 60 * 1000;
const CATEGORIES = ["transport", "electricity", "food", "shopping"];
const round2 = (n: number) => Math.round(n * 100) / 100;
const json = (data: unknown, status = 200) => Response.json(data, { status });
const fail = (message: string, status = 400) => json({ message }, status);
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const isIsoDate = (s: unknown) => typeof s === "string" && !Number.isNaN(Date.parse(s));

// ---------- Serializers (keep the response shape the client expects) ----------

function userJSON(u: User) {
  return {
    _id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar,
    streak: { current: u.streakCurrent, longest: u.streakLongest, lastActiveDate: u.lastActiveDate },
    totalCarbonSaved: u.totalCarbonSaved,
    badges: u.badges,
    settings: u.settings,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

const withId = <T extends { id: string }>({ id, ...rest }: T) => ({ _id: id, ...rest });

// ---------- Auth ----------

let cachedSecret: string | null = null;

// Uses JWT_SECRET when set; otherwise generates a random secret once and persists it in the database
async function jwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (cachedSecret) return cachedSecret;

  await db
    .insert(appConfig)
    .values({ key: "jwt_secret", value: randomBytes(48).toString("hex") })
    .onConflictDoNothing();
  const [row] = await db.select().from(appConfig).where(eq(appConfig.key, "jwt_secret"));
  cachedSecret = row.value;
  return cachedSecret;
}

const signToken = async (id: string) => jwt.sign({ id }, await jwtSecret(), { expiresIn: "30d" });

async function authenticate(req: Request): Promise<User | null> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, await jwtSecret()) as { id: string };
    if (!isUuid(decoded.id)) return null;
    const [user] = await db.select().from(users).where(eq(users.id, decoded.id));
    return user || null;
  } catch {
    return null;
  }
}

// ---------- Auth routes ----------

const register: Handler = async ({ body }) => {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (name.length < 2) return fail("Name must be at least 2 characters");
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Please enter a valid email");
  if (password.length < 6) return fail("Password must be at least 6 characters");

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) return fail("User already exists with this email");

  const hashed = await bcrypt.hash(password, 10);
  const [user] = await db.insert(users).values({ name: name.slice(0, 50), email, password: hashed }).returning();

  return json({ token: await signToken(user.id), user: userJSON(user) }, 201);
};

const login: Handler = async ({ body }) => {
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Please enter a valid email");
  if (!password) return fail("Password is required");

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return fail("Invalid credentials");
  }

  return json({ token: await signToken(user.id), user: userJSON(user) });
};

const me: Handler = ({ user }) => json(userJSON(user));

const updateProfile: Handler = async ({ user, body }) => {
  const updates: Partial<User> = { updatedAt: new Date() };
  if (body.name) updates.name = String(body.name).trim().slice(0, 50);
  if (body.avatar) updates.avatar = String(body.avatar);
  if (body.settings && typeof body.settings === "object") {
    updates.settings = { ...user.settings, ...body.settings };
  }

  const [updated] = await db.update(users).set(updates).where(eq(users.id, user.id)).returning();
  return json(userJSON(updated));
};

// ---------- Activities ----------

const createActivity: Handler = async ({ user, body }) => {
  const { category, subcategory, details, date } = body;
  if (!CATEGORIES.includes(category)) return fail("Invalid category");
  if (!subcategory) return fail("Subcategory is required");
  if (date && !isIsoDate(date)) return fail("Invalid date");

  let carbonEmission: number;
  try {
    carbonEmission = calculateEmission(category, subcategory, details || {});
  } catch (error: any) {
    return fail(error.message);
  }

  const [activity] = await db
    .insert(activities)
    .values({
      userId: user.id,
      date: date ? new Date(date) : new Date(),
      category,
      subcategory,
      details: details || {},
      carbonEmission,
    })
    .returning();

  await updateStreak(user.id);
  const newBadges = await checkAndAwardBadges(user.id);

  return json(
    { activity: withId(activity), newBadges, message: `Activity logged: ${carbonEmission} kg CO₂` },
    201
  );
};

const listActivities: Handler = async ({ user, url }) => {
  const q = url.searchParams;
  const limit = Math.min(Math.max(parseInt(q.get("limit") || "50") || 50, 1), 200);
  const page = Math.max(parseInt(q.get("page") || "1") || 1, 1);

  const conditions = [eq(activities.userId, user.id)];
  if (isIsoDate(q.get("startDate"))) conditions.push(gte(activities.date, new Date(q.get("startDate")!)));
  if (isIsoDate(q.get("endDate"))) conditions.push(lte(activities.date, new Date(q.get("endDate")!)));
  if (q.get("category")) conditions.push(eq(activities.category, q.get("category")!));

  const where = and(...conditions);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(activities)
      .where(where)
      .orderBy(desc(activities.date))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ total: count() }).from(activities).where(where),
  ]);

  return json({
    activities: rows.map(withId),
    pagination: { total, page, pages: Math.ceil(total / limit) },
  });
};

const activitySummary: Handler = async ({ user }) => {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekStart = new Date(todayStart.getTime() - 7 * DAY_MS);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [daily, weekly, monthly] = await Promise.all([
    sumEmissions(user.id, gte(activities.date, todayStart)),
    sumEmissions(user.id, gte(activities.date, weekStart)),
    sumEmissions(user.id, gte(activities.date, monthStart)),
  ]);

  return json({ daily, weekly, monthly });
};

const deleteActivity: Handler = async ({ user, params }) => {
  if (!isUuid(params.id)) return fail("Invalid ID format");
  const deleted = await db
    .delete(activities)
    .where(and(eq(activities.id, params.id), eq(activities.userId, user.id)))
    .returning({ id: activities.id });
  if (deleted.length === 0) return fail("Activity not found", 404);
  return json({ message: "Activity deleted" });
};

// ---------- Dashboard ----------

async function categoryTotals(userId: string, ...conditions: any[]) {
  return db
    .select({
      category: activities.category,
      total: sum(activities.carbonEmission).mapWith(Number),
      count: count(),
    })
    .from(activities)
    .where(and(eq(activities.userId, userId), ...conditions))
    .groupBy(activities.category);
}

const dashboardStats: Handler = async ({ user }) => {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [{ total: dailyEmission }, breakdown, { count: totalActivities }] = await Promise.all([
    sumEmissions(user.id, gte(activities.date, todayStart)),
    categoryTotals(user.id, gte(activities.date, monthStart)),
    sumEmissions(user.id),
  ]);

  const monthlyTotal = breakdown.reduce((s, c) => s + c.total, 0);
  // 1 tree absorbs ~22 kg CO₂/year
  const treesNeeded = Math.ceil((monthlyTotal * 12) / 22);

  return json({
    dailyEmission: round2(dailyEmission),
    carbonScore: getCarbonScore(dailyEmission),
    categoryBreakdown: breakdown.map((c) => ({ category: c.category, total: round2(c.total), count: c.count })),
    monthlyTotal: round2(monthlyTotal),
    totalActivities,
    treesNeeded,
    averageComparison: {
      userDaily: round2(dailyEmission),
      globalAverage: AVERAGE_DAILY_EMISSION,
      percentDiff: dailyEmission > 0 ? Math.round((dailyEmission / AVERAGE_DAILY_EMISSION - 1) * 100) : -100,
    },
  });
};

const CHART_FORMATS: Record<string, string> = {
  hour: `'HH24":00"'`,
  day: `'YYYY-MM-DD'`,
  month: `'YYYY-MM'`,
};

const chartData: Handler = async ({ user, url }) => {
  const period = url.searchParams.get("period") || "weekly";
  const now = new Date();
  let startDate = new Date(now.getTime() - 7 * DAY_MS);
  let format = CHART_FORMATS.day;

  if (period === "daily") {
    startDate = new Date(now.getTime() - DAY_MS);
    format = CHART_FORMATS.hour;
  } else if (period === "monthly") {
    startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  } else if (period === "yearly") {
    startDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    format = CHART_FORMATS.month;
  }

  // format comes from a fixed whitelist above, so it is safe to inline
  const bucket = sql<string>`to_char(${activities.date} at time zone 'UTC', ${sql.raw(format)})`;
  const rows = await db
    .select({ date: bucket, category: activities.category, total: sum(activities.carbonEmission).mapWith(Number) })
    .from(activities)
    .where(and(eq(activities.userId, user.id), gte(activities.date, startDate)))
    .groupBy(bucket, activities.category)
    .orderBy(asc(bucket));

  const dateMap: Record<string, any> = {};
  rows.forEach((item) => {
    if (!dateMap[item.date]) {
      dateMap[item.date] = { date: item.date, transport: 0, electricity: 0, food: 0, shopping: 0, total: 0 };
    }
    dateMap[item.date][item.category] = round2(item.total);
    dateMap[item.date].total += item.total;
  });
  Object.values(dateMap).forEach((d) => (d.total = round2(d.total)));

  return json(Object.values(dateMap));
};

const dashboardProgress: Handler = async ({ user }) => {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const [current, previous] = await Promise.all([
    categoryTotals(user.id, gte(activities.date, monthStart)),
    categoryTotals(user.id, gte(activities.date, prevMonthStart), lt(activities.date, monthStart)),
  ]);

  return json(
    CATEGORIES.map((cat) => {
      const curr = current.find((c) => c.category === cat)?.total || 0;
      const prev = previous.find((c) => c.category === cat)?.total || 0;
      const change = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;
      return { category: cat, current: round2(curr), previous: round2(prev), change, improved: change < 0 };
    })
  );
};

// ---------- Goals ----------

const createGoal: Handler = async ({ user, body }) => {
  const title = String(body.title || "").trim();
  const targetReduction = Number(body.targetReduction);
  const category = body.category || "overall";

  if (!title) return fail("Title is required");
  if (!(targetReduction >= 1 && targetReduction <= 100)) return fail("Target reduction must be between 1 and 100");
  if (!isIsoDate(body.endDate)) return fail("A valid end date is required");
  if (category !== "overall" && !CATEGORIES.includes(category)) return fail("Invalid category");

  // Baseline from the last 30 days
  const conditions = [gte(activities.date, new Date(Date.now() - 30 * DAY_MS))];
  if (category !== "overall") conditions.push(eq(activities.category, category));
  const { total } = await sumEmissions(user.id, ...conditions);

  const [goal] = await db
    .insert(goals)
    .values({
      userId: user.id,
      title: title.slice(0, 100),
      description: String(body.description || "").slice(0, 500),
      category,
      targetReduction,
      baselineEmission: total || 100,
      startDate: new Date(),
      endDate: new Date(body.endDate),
    })
    .returning();

  return json(withId(goal), 201);
};

const listGoals: Handler = async ({ user }) => {
  const rows = await db.select().from(goals).where(eq(goals.userId, user.id)).orderBy(desc(goals.createdAt));

  // Refresh progress for active goals
  const updated = await Promise.all(
    rows.map(async (goal) => {
      if (goal.status !== "active") return goal;

      const conditions = [gte(activities.date, goal.startDate)];
      if (goal.category !== "overall") conditions.push(eq(activities.category, goal.category));
      const { total: currentEmission } = await sumEmissions(user.id, ...conditions);

      const reduction =
        goal.baselineEmission > 0 ? ((goal.baselineEmission - currentEmission) / goal.baselineEmission) * 100 : 0;
      const progress = Math.min(100, Math.max(0, Math.round((reduction / goal.targetReduction) * 100)));

      let status = goal.status;
      if (progress >= 100) status = "completed";
      else if (new Date() > goal.endDate) status = "failed";

      const [saved] = await db
        .update(goals)
        .set({ currentEmission, progress, status, updatedAt: new Date() })
        .where(eq(goals.id, goal.id))
        .returning();
      return saved;
    })
  );

  return json(updated.map(withId));
};

const updateGoal: Handler = async ({ user, params, body }) => {
  if (!isUuid(params.id)) return fail("Invalid ID format");

  const updates: Partial<typeof goals.$inferInsert> = { updatedAt: new Date() };
  if (body.title) updates.title = String(body.title).trim().slice(0, 100);
  if (body.description !== undefined) updates.description = String(body.description).slice(0, 500);
  if (body.targetReduction) updates.targetReduction = Number(body.targetReduction);
  if (body.endDate && isIsoDate(body.endDate)) updates.endDate = new Date(body.endDate);
  if (["active", "completed", "failed", "paused"].includes(body.status)) updates.status = body.status;

  const [goal] = await db
    .update(goals)
    .set(updates)
    .where(and(eq(goals.id, params.id), eq(goals.userId, user.id)))
    .returning();
  if (!goal) return fail("Goal not found", 404);
  return json(withId(goal));
};

const deleteGoal: Handler = async ({ user, params }) => {
  if (!isUuid(params.id)) return fail("Invalid ID format");
  const deleted = await db
    .delete(goals)
    .where(and(eq(goals.id, params.id), eq(goals.userId, user.id)))
    .returning({ id: goals.id });
  if (deleted.length === 0) return fail("Goal not found", 404);
  return json({ message: "Goal deleted" });
};

// ---------- Insights ----------

const insights: Handler = async ({ user }) => json(await generateInsights(user.id));

const tips: Handler = () => {
  // Rotate tips daily so users see different ones each day
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 0)) / DAY_MS);
  const start = dayOfYear % ECO_TIPS.length;
  return json([0, 1, 2].map((i) => ECO_TIPS[(start + i) % ECO_TIPS.length]));
};

// ---------- Gamification ----------

const badges: Handler = ({ user }) => {
  const earnedIds = user.badges.map((b) => b.badgeId);
  const all = (BADGES as any[]).map((badge) => ({
    ...badge,
    earned: earnedIds.includes(badge.id),
    earnedAt: user.badges.find((b) => b.badgeId === badge.id)?.earnedAt || null,
  }));

  return json({
    earned: all.filter((b) => b.earned),
    available: all.filter((b) => !b.earned),
    total: BADGES.length,
    earnedCount: earnedIds.length,
  });
};

const leaderboard: Handler = async ({ user }) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS);
  const totalEmissions = sql<number>`sum(${activities.carbonEmission})`.mapWith(Number);

  // Lower emissions rank higher
  const rows = await db
    .select({
      _id: users.id,
      name: users.name,
      avatar: users.avatar,
      totalEmissions,
      activityCount: count(),
      streak: users.streakCurrent,
      badgeCount: sql<number>`jsonb_array_length(${users.badges})`.mapWith(Number),
    })
    .from(activities)
    .innerJoin(users, eq(activities.userId, users.id))
    .where(gte(activities.date, thirtyDaysAgo))
    .groupBy(users.id)
    .orderBy(asc(totalEmissions))
    .limit(20);

  const ranked = rows.map((entry, index) => ({
    rank: index + 1,
    ...entry,
    totalEmissions: round2(entry.totalEmissions),
  }));

  return json({ leaderboard: ranked, userRank: ranked.find((e) => e._id === user.id)?.rank || null });
};

const streak: Handler = ({ user }) =>
  json({ current: user.streakCurrent, longest: user.streakLongest, lastActiveDate: user.lastActiveDate });

// ---------- Notifications ----------

const listNotifications: Handler = async ({ user, url }) => {
  const conditions = [eq(notifications.userId, user.id)];
  if (url.searchParams.get("unreadOnly") === "true") conditions.push(eq(notifications.read, false));

  const [rows, [{ unreadCount }]] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(30),
    db
      .select({ unreadCount: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.read, false))),
  ]);

  return json({ notifications: rows.map(withId), unreadCount });
};

const markRead: Handler = async ({ user, params }) => {
  if (!isUuid(params.id)) return fail("Invalid ID format");
  const [notification] = await db
    .update(notifications)
    .set({ read: true, updatedAt: new Date() })
    .where(and(eq(notifications.id, params.id), eq(notifications.userId, user.id)))
    .returning();
  if (!notification) return fail("Notification not found", 404);
  return json(withId(notification));
};

const markAllRead: Handler = async ({ user }) => {
  await db
    .update(notifications)
    .set({ read: true, updatedAt: new Date() })
    .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));
  return json({ message: "All notifications marked as read" });
};

// ---------- Router ----------

type Route = { method: string; pattern: string; handler: Handler; public?: boolean };

const routes: Route[] = [
  { method: "GET", pattern: "/health", handler: () => json({ status: "ok", timestamp: new Date().toISOString() }), public: true },
  { method: "POST", pattern: "/auth/register", handler: register, public: true },
  { method: "POST", pattern: "/auth/login", handler: login, public: true },
  { method: "GET", pattern: "/auth/me", handler: me },
  { method: "PUT", pattern: "/auth/profile", handler: updateProfile },
  { method: "POST", pattern: "/activities", handler: createActivity },
  { method: "GET", pattern: "/activities", handler: listActivities },
  { method: "GET", pattern: "/activities/summary", handler: activitySummary },
  { method: "DELETE", pattern: "/activities/:id", handler: deleteActivity },
  { method: "GET", pattern: "/dashboard/stats", handler: dashboardStats },
  { method: "GET", pattern: "/dashboard/chart-data", handler: chartData },
  { method: "GET", pattern: "/dashboard/progress", handler: dashboardProgress },
  { method: "POST", pattern: "/goals", handler: createGoal },
  { method: "GET", pattern: "/goals", handler: listGoals },
  { method: "PUT", pattern: "/goals/:id", handler: updateGoal },
  { method: "DELETE", pattern: "/goals/:id", handler: deleteGoal },
  { method: "GET", pattern: "/insights", handler: insights },
  { method: "GET", pattern: "/insights/tips", handler: tips },
  { method: "GET", pattern: "/gamification/badges", handler: badges },
  { method: "GET", pattern: "/gamification/leaderboard", handler: leaderboard },
  { method: "GET", pattern: "/gamification/streak", handler: streak },
  { method: "GET", pattern: "/notifications", handler: listNotifications },
  { method: "PUT", pattern: "/notifications/read-all", handler: markAllRead },
  { method: "PUT", pattern: "/notifications/:id/read", handler: markRead },
];

function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split("/");
  const s = path.split("/");
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, "").replace(/\/+$/, "") || "/";

  let params: Record<string, string> | null = null;
  const route = routes.find((r) => r.method === req.method && (params = match(r.pattern, path)));
  if (!route || !params) return fail("Not found", 404);

  try {
    let body: any = {};
    if (req.method === "POST" || req.method === "PUT") {
      body = await req.json().catch(() => ({}));
    }

    let user = null as unknown as User;
    if (!route.public) {
      const authed = await authenticate(req);
      if (!authed) return fail(req.headers.get("authorization") ? "Token is not valid" : "No token, authorization denied", 401);
      user = authed;
    }

    return await route.handler({ req, url, params, body, user });
  } catch (error: any) {
    console.error(`${req.method} ${url.pathname} failed:`, error);
    if (error?.code === "23505") return fail("Duplicate field value entered");
    return fail("Server error", 500);
  }
};

export const config: Config = {
  path: "/api/*",
};
