const { EMISSION_FACTORS } = require('../utils/emissionFactors');

/**
 * Calculate carbon emission for a given activity
 * @param {string} category - Activity category (transport, electricity, food, shopping)
 * @param {string} subcategory - Activity subcategory (car_petrol, grid, non_veg, etc.)
 * @param {object} details - Activity details (distance, quantity, etc.)
 * @returns {number} Carbon emission in kg CO₂
 */
function calculateEmission(category, subcategory, details) {
  const factors = EMISSION_FACTORS[category];
  if (!factors || !factors[subcategory]) {
    throw new Error(`Unknown activity: ${category}/${subcategory}`);
  }

  const { factor, unit } = factors[subcategory];

  let quantity = 0;

  switch (category) {
    case 'transport':
      quantity = details.distance || 0;
      break;
    case 'electricity':
      quantity = details.quantity || 0; // kWh
      break;
    case 'food':
      quantity = details.quantity || 1; // number of meals
      break;
    case 'shopping':
      quantity = details.quantity || 1; // number of items/bags
      break;
    default:
      quantity = details.quantity || 0;
  }

  const emission = Math.round(factor * quantity * 100) / 100;
  return emission;
}

/**
 * Get carbon score level based on daily emissions
 * @param {number} dailyEmission - Daily emission in kg CO₂
 * @returns {object} Score level with label and color
 */
function getCarbonScore(dailyEmission) {
  if (dailyEmission < 8) {
    return { level: 'low', label: 'Low', color: '#22c55e', score: Math.max(0, 100 - dailyEmission * 6) };
  } else if (dailyEmission < 20) {
    return { level: 'medium', label: 'Medium', color: '#f59e0b', score: Math.max(20, 70 - (dailyEmission - 8) * 3) };
  } else {
    return { level: 'high', label: 'High', color: '#ef4444', score: Math.max(0, 30 - (dailyEmission - 20)) };
  }
}

module.exports = { calculateEmission, getCarbonScore };
