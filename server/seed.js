const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('./models/User');
const Activity = require('./models/Activity');
const Goal = require('./models/Goal');
const Notification = require('./models/Notification');
const { calculateEmission } = require('./services/emissionCalculator');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecotrack';

async function seed() {
  try {
    console.log('🌱 Starting database seed...');
    
    // Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // Clear existing data
    await User.deleteMany({});
    await Activity.deleteMany({});
    await Goal.deleteMany({});
    await Notification.deleteMany({});
    console.log('Cleared existing data.');

    // Create 3 seed users
    const alice = new User({
      name: 'Alice Green',
      email: 'alice@ecotrack.org',
      password: 'password123',
      avatar: '🐼',
      joinDate: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
      streak: { current: 5, longest: 12, lastActiveDate: new Date() },
      totalCarbonSaved: 125,
      badges: [
        { badgeId: 'first_step', earnedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        { badgeId: 'week_warrior', earnedAt: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000) },
        { badgeId: 'veggie_champion', earnedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
        { badgeId: 'green_commuter', earnedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
      ],
      settings: { notifications: true, dailyReminder: true, unit: 'metric' }
    });

    const bob = new User({
      name: 'Bob Woods',
      email: 'bob@ecotrack.org',
      password: 'password123',
      avatar: '🦊',
      joinDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      streak: { current: 3, longest: 8, lastActiveDate: new Date() },
      totalCarbonSaved: 45,
      badges: [
        { badgeId: 'first_step', earnedAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000) }
      ],
      settings: { notifications: true, dailyReminder: true, unit: 'metric' }
    });

    const charlie = new User({
      name: 'Charlie Ocean',
      email: 'charlie@ecotrack.org',
      password: 'password123',
      avatar: '🌊',
      joinDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      streak: { current: 1, longest: 3, lastActiveDate: new Date() },
      totalCarbonSaved: 5,
      badges: [
        { badgeId: 'first_step', earnedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
      ],
      settings: { notifications: true, dailyReminder: false, unit: 'metric' }
    });

    await alice.save();
    await bob.save();
    await charlie.save();
    console.log('Users created.');

    // Helper to generate past activities
    const addActivity = async (userId, daysAgo, category, subcategory, details) => {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      const carbonEmission = calculateEmission(category, subcategory, details);
      
      const activity = new Activity({
        userId,
        date,
        category,
        subcategory,
        details,
        carbonEmission
      });
      await activity.save();
    };

    // --- ALICE: Green Lifestyle (past 30 days) ---
    for (let i = 30; i >= 0; i--) {
      // Alice logs daily vegetarian or vegan meals
      await addActivity(alice._id, i, 'food', i % 3 === 0 ? 'vegan' : 'vegetarian', { quantity: 2 });
      
      // Alice commutes by bike, walk or bus
      if (i % 2 === 0) {
        await addActivity(alice._id, i, 'transport', i % 4 === 0 ? 'bus' : 'bike', { distance: 10 });
      }
      
      // Alice has solar power (monthly logging approximated)
      if (i % 10 === 0) {
        await addActivity(alice._id, i, 'electricity', 'solar', { quantity: 40 });
      }

      // Alice shops minimally
      if (i === 15) {
        await addActivity(alice._id, i, 'shopping', 'groceries', { quantity: 2 });
      }
    }

    // --- BOB: Mid-Emission Lifestyle (past 20 days) ---
    for (let i = 20; i >= 0; i--) {
      // Bob logs meals (mix of non-veg and vegetarian)
      await addActivity(bob._id, i, 'food', i % 2 === 0 ? 'vegetarian' : 'non_veg', { quantity: 2 });

      // Bob drives diesel car or takes train
      if (i % 3 === 0) {
        await addActivity(bob._id, i, 'transport', 'car_diesel', { distance: 25 });
      } else if (i % 3 === 1) {
        await addActivity(bob._id, i, 'transport', 'train', { distance: 30 });
      }

      // Bob uses grid electricity
      if (i % 7 === 0) {
        await addActivity(bob._id, i, 'electricity', 'grid', { quantity: 60 });
      }

      // Bob shops normally
      if (i === 10 || i === 4) {
        await addActivity(bob._id, i, 'shopping', 'clothing', { quantity: 2 });
      }
    }

    // --- CHARLIE: High-Emission Lifestyle (past 15 days) ---
    for (let i = 15; i >= 0; i--) {
      // Charlie eats mostly non-veg meals
      await addActivity(charlie._id, i, 'food', 'non_veg', { quantity: 2 });

      // Charlie drives a petrol car every day
      await addActivity(charlie._id, i, 'transport', 'car_petrol', { distance: 35 });

      // Charlie travels by plane once
      if (i === 12) {
        await addActivity(charlie._id, i, 'transport', 'flight_domestic', { distance: 450 });
      }

      // Charlie uses grid power heavily
      if (i % 5 === 0) {
        await addActivity(charlie._id, i, 'electricity', 'grid', { quantity: 95 });
      }

      // Charlie buys electronics & general items
      if (i === 8) {
        await addActivity(charlie._id, i, 'shopping', 'electronics', { quantity: 1 });
      }
      if (i === 3) {
        await addActivity(charlie._id, i, 'shopping', 'general', { quantity: 3 });
      }
    }

    console.log('Activities populated.');

    // Add some goals
    const aliceGoal = new Goal({
      userId: alice._id,
      title: 'Keep it Green!',
      description: 'Log transport and meals daily',
      category: 'overall',
      targetReduction: 10,
      baselineEmission: 110,
      currentEmission: 24,
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      status: 'active',
      progress: 68
    });

    const bobGoal = new Goal({
      userId: bob._id,
      title: 'Reduce Car Travel',
      description: 'Switch driving with train travel',
      category: 'transport',
      targetReduction: 15,
      baselineEmission: 65,
      currentEmission: 35,
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      status: 'active',
      progress: 42
    });

    await aliceGoal.save();
    await bobGoal.save();
    console.log('Goals populated.');

    // Add initial notifications
    const notif1 = new Notification({
      userId: alice._id,
      type: 'achievement',
      title: 'Badge Earned: Veggie Champion!',
      message: 'You have logged 20 vegetarian or vegan meals. Keep up the clean eating!',
      read: false
    });

    const notif2 = new Notification({
      userId: alice._id,
      type: 'tip',
      title: 'Eco Tip of the Day',
      message: 'Did you know? Walking short distances under 2km saves about 0.4 kg CO2 per trip!',
      read: true
    });

    await notif1.save();
    await notif2.save();
    console.log('Notifications populated.');

    console.log('🎉 Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
