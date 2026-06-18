// Standard emission factors (kg CO₂ per unit)
// Sources: EPA, DEFRA, IPCC

const EMISSION_FACTORS = {
  transport: {
    car_petrol: { factor: 0.21, unit: 'km', label: 'Car (Petrol)' },
    car_diesel: { factor: 0.17, unit: 'km', label: 'Car (Diesel)' },
    car_electric: { factor: 0.05, unit: 'km', label: 'Car (Electric)' },
    motorcycle: { factor: 0.103, unit: 'km', label: 'Motorcycle' },
    bus: { factor: 0.089, unit: 'km', label: 'Bus' },
    train: { factor: 0.041, unit: 'km', label: 'Train' },
    bike: { factor: 0.0, unit: 'km', label: 'Bicycle' },
    walk: { factor: 0.0, unit: 'km', label: 'Walking' },
    flight_domestic: { factor: 0.255, unit: 'km', label: 'Flight (Domestic)' },
    flight_international: { factor: 0.195, unit: 'km', label: 'Flight (International)' }
  },
  electricity: {
    grid: { factor: 0.42, unit: 'kWh', label: 'Grid Power' },
    solar: { factor: 0.05, unit: 'kWh', label: 'Solar Power' },
    wind: { factor: 0.01, unit: 'kWh', label: 'Wind Power' }
  },
  food: {
    non_veg: { factor: 3.3, unit: 'meal', label: 'Non-Vegetarian' },
    vegetarian: { factor: 1.7, unit: 'meal', label: 'Vegetarian' },
    vegan: { factor: 0.9, unit: 'meal', label: 'Vegan' }
  },
  shopping: {
    clothing: { factor: 10.0, unit: 'item', label: 'Clothing' },
    electronics: { factor: 50.0, unit: 'item', label: 'Electronics' },
    groceries: { factor: 2.0, unit: 'bag', label: 'Groceries' },
    furniture: { factor: 75.0, unit: 'item', label: 'Furniture' },
    general: { factor: 5.0, unit: 'item', label: 'General Items' }
  }
};

// Average daily emissions for comparison (kg CO₂)
const AVERAGE_DAILY_EMISSION = 16.0; // Global average per person

// Carbon score thresholds (daily kg CO₂)
const CARBON_SCORE = {
  low: { max: 8, label: 'Low', color: '#22c55e' },
  medium: { min: 8, max: 20, label: 'Medium', color: '#f59e0b' },
  high: { min: 20, label: 'High', color: '#ef4444' }
};

// Badge definitions
const BADGES = [
  {
    id: 'first_step',
    name: 'First Step',
    icon: '🌱',
    description: 'Log your first activity',
    criteria: { type: 'activity_count', value: 1 }
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    icon: '🌿',
    description: '7-day logging streak',
    criteria: { type: 'streak', value: 7 }
  },
  {
    id: 'month_master',
    name: 'Month Master',
    icon: '🌳',
    description: '30-day logging streak',
    criteria: { type: 'streak', value: 30 }
  },
  {
    id: 'green_commuter',
    name: 'Green Commuter',
    icon: '🚲',
    description: 'Log 10 bike or walk trips',
    criteria: { type: 'green_transport', value: 10 }
  },
  {
    id: 'veggie_champion',
    name: 'Veggie Champion',
    icon: '🥗',
    description: 'Log 20 vegetarian or vegan meals',
    criteria: { type: 'veggie_meals', value: 20 }
  },
  {
    id: 'energy_saver',
    name: 'Energy Saver',
    icon: '⚡',
    description: 'Reduce electricity usage by 20%',
    criteria: { type: 'electricity_reduction', value: 20 }
  },
  {
    id: 'carbon_cutter',
    name: 'Carbon Cutter',
    icon: '🏆',
    description: 'Reduce total emissions by 25%',
    criteria: { type: 'total_reduction', value: 25 }
  },
  {
    id: 'eco_hero',
    name: 'Eco Hero',
    icon: '🌍',
    description: 'Maintain Low carbon score for 30 days',
    criteria: { type: 'low_score_days', value: 30 }
  },
  {
    id: 'goal_getter',
    name: 'Goal Getter',
    icon: '🎯',
    description: 'Complete 3 carbon reduction goals',
    criteria: { type: 'goals_completed', value: 3 }
  },
  {
    id: 'on_fire',
    name: 'On Fire',
    icon: '🔥',
    description: '14-day logging streak',
    criteria: { type: 'streak', value: 14 }
  }
];

// Eco tips pool
const ECO_TIPS = [
  { title: 'Walk or Bike', message: 'Short trips under 2km? Try walking or biking instead of driving. You\'ll save about 0.4 kg CO₂ per trip!', icon: '🚶' },
  { title: 'Meal Prep', message: 'Cooking at home reduces food waste and carbon emissions compared to eating out or ordering delivery.', icon: '🍳' },
  { title: 'Unplug Electronics', message: 'Phantom power can account for 5-10% of your home electricity use. Unplug chargers and devices when not in use.', icon: '🔌' },
  { title: 'Public Transport', message: 'Taking the bus instead of driving alone can reduce your transport emissions by up to 60%.', icon: '🚌' },
  { title: 'Meatless Monday', message: 'Going meat-free just one day a week can save about 90 kg CO₂ per year.', icon: '🥦' },
  { title: 'LED Lighting', message: 'Switching to LED bulbs uses 75% less energy than incandescent bulbs and lasts 25 times longer.', icon: '💡' },
  { title: 'Reuse & Repair', message: 'Before buying new, consider if you can repair, borrow, or buy second-hand. Manufacturing new products has a huge carbon cost.', icon: '♻️' },
  { title: 'Cold Water Wash', message: 'Washing clothes in cold water can reduce energy use per load by up to 90%.', icon: '🧺' },
  { title: 'Plant a Tree', message: 'A single tree can absorb up to 22 kg of CO₂ per year. Consider planting one in your yard or community.', icon: '🌲' },
  { title: 'Reduce Food Waste', message: 'About 8-10% of global emissions come from food waste. Plan meals and store food properly to reduce waste.', icon: '🍎' },
  { title: 'Carpool', message: 'Sharing a ride with just one other person halves your per-person transport emissions.', icon: '🚗' },
  { title: 'Air Dry Clothes', message: 'Skip the dryer when possible. Air drying saves about 2.4 kg CO₂ per load.', icon: '👕' }
];

module.exports = {
  EMISSION_FACTORS,
  AVERAGE_DAILY_EMISSION,
  CARBON_SCORE,
  BADGES,
  ECO_TIPS
};
