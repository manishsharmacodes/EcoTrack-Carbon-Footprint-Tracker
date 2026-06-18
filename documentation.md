# 📖 EcoTrack Project Documentation

Welcome to the documentation for **EcoTrack** — a premium carbon footprint tracking web application.

---

## 👥 Seed User Credentials

Use these pre-seeded accounts to log in and explore the app's features. All accounts have their profile settings, historical carbon footprint log graphs, and active reduction goals pre-loaded.

| User Name | Email Address | Password | Avatar Preset | Initial Status |
| :--- | :--- | :--- | :--- | :--- |
| **Alice Green** | `alice@ecotrack.org` | `password123` | 🐼 (Panda) | 1st Place (Leaderboard), 5-day streak, 5 badges unlocked |
| **Bob Woods** | `bob@ecotrack.org` | `password123` | 🦊 (Fox) | 2nd Place (Leaderboard), 3-day streak, 1 badge unlocked |
| **Charlie Ocean**| `charlie@ecotrack.org`| `password123` | 🌊 (Wave) | 3rd Place (Leaderboard), 1-day streak, 1 badge unlocked |

---

## 🚀 App Architecture & Tech Stack

EcoTrack is built as a single-repo full-stack JavaScript application:

- **Frontend (SPA)**: React 18, Vite 5, Axios (REST API calls), React Router 6, Recharts (Responsive area, bar, and pie charts), React Hot Toast (Toast notification overlays).
- **Backend (API)**: Node.js, Express, MongoDB (via Mongoose ODM).
- **Security & Session**: JSON Web Tokens (JWT) for stateless sessions, `bcryptjs` for secure password hashing.
- **Design System**: Vanilla CSS featuring CSS Variables, full dark-mode palette, glassmorphism card panels (`backdrop-filter`), and premium micro-animations.

---

## 🗃️ MongoDB Models & Collections

### 1. User (`User.js`)
Stores account credentials, profile settings, gamified streaks, and unlocked badges:
- `name` (String): Full user display name.
- `email` (String, unique): User email.
- `password` (String): Hashed password.
- `avatar` (String): Selected emoji/icon representation.
- `streak` (Object): `{ current: Number, longest: Number, lastActiveDate: Date }`.
- `badges` (Array): List of `{ badgeId: String, earnedAt: Date }`.
- `settings` (Object): `{ notifications: Boolean, dailyReminder: Boolean, unit: String }`.

### 2. Activity (`Activity.js`)
Tracks individual logged activities that impact carbon footprints:
- `category` (String): `transport`, `electricity`, `food`, or `shopping`.
- `subcategory` (String): Sub-type (e.g. `car_petrol`, `vegan`, `grid`).
- `details` (Object): Context values (e.g. `distance` in km, `quantity` in kWh, `mealType`).
- `carbonEmission` (Number): Computed footprint in kg CO₂.

### 3. Goal (`Goal.js`)
Configuration for carbon emission reduction goals:
- `targetReduction` (Number): Desired reduction percentage (1% to 100%).
- `baselineEmission` (Number): Total emissions in the 30 days prior to setting the goal.
- `currentEmission` (Number): Emissions logged since starting the goal.
- `progress` (Number): Percentage achievement progress (0% to 100%).
- `status` (String): `active`, `completed`, or `failed`.

### 4. Notification (`Notification.js`)
Keeps track of user alerts:
- `type` (String): `tip`, `reminder`, `achievement`, or `milestone`.
- `title` / `message` (String): Heading and details of the alert.
- `read` (Boolean): Read/unread status flag.

---

## 🎛️ Emission Factors & Logic

Carbon output calculations are based on standard conversion factors (kg CO₂ per unit):

### 🚗 Transportation (per km)
- Petrol Car: `0.21` kg CO₂
- Diesel Car: `0.17` kg CO₂
- Electric Car: `0.05` kg CO₂
- Motorcycle: `0.103` kg CO₂
- Bus: `0.089` kg CO₂
- Train: `0.041` kg CO₂
- Domestic Flight: `0.255` kg CO₂
- International Flight: `0.195` kg CO₂
- Bike / Walk: `0.0` kg CO₂

### ⚡ Electricity (per kWh)
- Grid Electricity: `0.42` kg CO₂
- Solar: `0.05` kg CO₂
- Wind: `0.01` kg CO₂

### 🥗 Food & Diet (per meal)
- Non-Veg meal: `3.3` kg CO₂
- Vegetarian meal: `1.7` kg CO₂
- Vegan meal: `0.9` kg CO₂

### 🛍️ Shopping (per item)
- Clothing item: `10.0` kg CO₂
- Electronics: `50.0` kg CO₂
- Groceries: `2.0` kg CO₂

---

## 🏆 Badge Unlocking System

Badges are awarded automatically in the backend upon logging activities:
1. **🌱 First Step**: Awarded on logging your first activity.
2. **🌿 Week Warrior**: Awarded for a 7-day activity logging streak.
3. **🌳 Month Master**: Awarded for a 30-day activity logging streak.
4. **🚲 Green Commuter**: Awarded when a user logs 10+ bike or walking activities.
5. **🥗 Veggie Champion**: Awarded when a user logs 20+ vegetarian or vegan meals.
6. **🏆 Eco Hero**: Awarded when a user keeps their daily average footprint below `5.0 kg CO₂` for 30 consecutive days.
