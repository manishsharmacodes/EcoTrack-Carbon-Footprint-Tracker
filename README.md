# 🌿 EcoTrack — Carbon Footprint Tracker

EcoTrack is a modern, user-friendly web application designed to help individuals understand, track, and reduce their carbon footprint through daily activity tracking, personalized rule-based insights, achievement badges, and goal setting.

---

## 🚀 Key Features

1. **Dashboard & Summary**:
   - Total carbon footprint score (Low, Medium, High).
   - Real-time time-series area charts showing emission trends.
   - Category breakdowns (Pie chart) and month-over-month progress bars.
   - Dynamic Daily Eco Tips.

2. **Activity Logging**:
   - Track activities across **Transportation**, **Electricity**, **Food**, and **Shopping**.
   - Live carbon emission estimation preview before logging.
   - Full history with pagination and deletion.

3. **Carbon Calculator**:
   - Standalone lifestyle estimator. Adjust sliders to see weekly CO₂ output instantly compared to global benchmarks.

4. **Personalized Insights**:
   - Dynamic rule-based recommendation cards offering advice tailored to user data.
   - Monthly potential carbon savings metric.

5. **Gamification (Streak & Badges)**:
   - Logging streak flames tracking consecutive active days.
   - Unlocked/Locked badges with condition criteria.
   - Top 20 user leaderboard based on lowest emissions.

6. **Reduction Goals**:
   - Set custom percentage reduction targets against your recent 30-day baseline.
   - Track target end-dates, progress bar fill, and timeline indicators.

7. **System Notifications**:
   - Feed of tips, streak warnings, and badge unlock alerts.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), React Router, Axios, Recharts, React Icons, React Hot Toast
- **Backend**: Node.js, Express, Mongoose (MongoDB)
- **Database**: MongoDB (Local or Atlas)
- **Styling**: Vanilla CSS (Custom tokens, default dark mode, glassmorphism UI)

---

## ⚙️ Project Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [MongoDB](https://www.mongodb.com/try/download/community) (Running locally on `mongodb://localhost:27017` or Atlas URL)

### 1. Installation
In the project root, run:
```bash
npm run install-all
```
This script will concurrently install dependencies for the root, backend server, and React client.

### 2. Configuration
Create a `.env` file in the root directory (or copy `.env.example`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ecotrack
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:5173
```

### 3. Run Locally
To start both the client and server concurrently, run:
```bash
npm run dev
```
- **React Frontend**: [http://localhost:5173](http://localhost:5173)
- **Express Backend**: [http://localhost:5000](http://localhost:5000)

---

## 🌳 Emission Calculation Reference

Standard factors mapped to convert raw units to kg CO₂ emissions:

| Category | Type | Factor | Unit |
| :--- | :--- | :--- | :--- |
| **Transport** | Car (Petrol) | `0.21` | per km |
| **Transport** | Car (Diesel) | `0.17` | per km |
| **Transport** | Car (Electric) | `0.05` | per km |
| **Transport** | Motorcycle | `0.103` | per km |
| **Transport** | Bus | `0.089` | per km |
| **Transport** | Train | `0.041` | per km |
| **Transport** | Flight (Domestic) | `0.255` | per km |
| **Transport** | Flight (International)| `0.195` | per km |
| **Electricity**| Grid Power | `0.42` | per kWh |
| **Electricity**| Solar / Wind | `0.05` / `0.01` | per kWh |
| **Food** | Non-Veg meal | `3.3` | per meal |
| **Food** | Vegetarian meal | `1.7` | per meal |
| **Food** | Vegan meal | `0.9` | per meal |
| **Shopping** | Clothing | `10.0` | per item |
| **Shopping** | Electronics | `50.0` | per item |
| **Shopping** | Groceries | `2.0` | per bag |
