import { pgTable, uuid, text, timestamp, integer, doublePrecision, boolean, jsonb, index } from "drizzle-orm/pg-core";

export type UserSettings = { notifications: boolean; dailyReminder: boolean; unit: "metric" | "imperial" };
export type EarnedBadge = { badgeId: string; earnedAt: string };
export type ActivityDetails = {
  distance?: number;
  duration?: number;
  quantity?: number;
  fuelType?: string;
  mealType?: string;
};

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  email: text().notNull().unique(),
  password: text().notNull(),
  avatar: text().notNull().default(""),
  streakCurrent: integer("streak_current").notNull().default(0),
  streakLongest: integer("streak_longest").notNull().default(0),
  lastActiveDate: timestamp("last_active_date", { withTimezone: true }),
  totalCarbonSaved: doublePrecision("total_carbon_saved").notNull().default(0),
  badges: jsonb().$type<EarnedBadge[]>().notNull().default([]),
  settings: jsonb()
    .$type<UserSettings>()
    .notNull()
    .default({ notifications: true, dailyReminder: true, unit: "metric" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activities = pgTable(
  "activities",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: timestamp({ withTimezone: true }).notNull().defaultNow(),
    category: text().notNull(),
    subcategory: text().notNull(),
    details: jsonb().$type<ActivityDetails>().notNull().default({}),
    carbonEmission: doublePrecision("carbon_emission").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("activities_user_date_idx").on(t.userId, t.date),
    index("activities_user_category_idx").on(t.userId, t.category),
  ]
);

export const goals = pgTable(
  "goals",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text().notNull(),
    description: text().notNull().default(""),
    category: text().notNull().default("overall"),
    targetReduction: doublePrecision("target_reduction").notNull(),
    baselineEmission: doublePrecision("baseline_emission").notNull(),
    currentEmission: doublePrecision("current_emission").notNull().default(0),
    startDate: timestamp("start_date", { withTimezone: true }).notNull().defaultNow(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    status: text().notNull().default("active"),
    progress: integer().notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("goals_user_idx").on(t.userId)]
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text().notNull(),
    title: text().notNull(),
    message: text().notNull(),
    icon: text().notNull().default("💡"),
    read: boolean().notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)]
);

// Server-side key/value settings (e.g. the generated JWT signing secret)
export const appConfig = pgTable("app_config", {
  key: text().primaryKey(),
  value: text().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
