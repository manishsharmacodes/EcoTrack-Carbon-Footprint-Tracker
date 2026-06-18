// Client-side emission factors (mirrors server)
export const EMISSION_FACTORS = {
  transport: {
    car_petrol: { factor: 0.21, unit: 'km', label: 'Car (Petrol)', icon: '🚗' },
    car_diesel: { factor: 0.17, unit: 'km', label: 'Car (Diesel)', icon: '🚗' },
    car_electric: { factor: 0.05, unit: 'km', label: 'Car (Electric)', icon: '⚡' },
    motorcycle: { factor: 0.103, unit: 'km', label: 'Motorcycle', icon: '🏍️' },
    bus: { factor: 0.089, unit: 'km', label: 'Bus', icon: '🚌' },
    train: { factor: 0.041, unit: 'km', label: 'Train', icon: '🚆' },
    bike: { factor: 0.0, unit: 'km', label: 'Bicycle', icon: '🚲' },
    walk: { factor: 0.0, unit: 'km', label: 'Walking', icon: '🚶' },
    flight_domestic: { factor: 0.255, unit: 'km', label: 'Flight (Domestic)', icon: '✈️' },
    flight_international: { factor: 0.195, unit: 'km', label: 'Flight (International)', icon: '✈️' }
  },
  electricity: {
    grid: { factor: 0.42, unit: 'kWh', label: 'Grid Power', icon: '🔌' },
    solar: { factor: 0.05, unit: 'kWh', label: 'Solar Power', icon: '☀️' },
    wind: { factor: 0.01, unit: 'kWh', label: 'Wind Power', icon: '💨' }
  },
  food: {
    non_veg: { factor: 3.3, unit: 'meal', label: 'Non-Vegetarian', icon: '🥩' },
    vegetarian: { factor: 1.7, unit: 'meal', label: 'Vegetarian', icon: '🥗' },
    vegan: { factor: 0.9, unit: 'meal', label: 'Vegan', icon: '🌱' }
  },
  shopping: {
    clothing: { factor: 10.0, unit: 'item', label: 'Clothing', icon: '👕' },
    electronics: { factor: 50.0, unit: 'item', label: 'Electronics', icon: '📱' },
    groceries: { factor: 2.0, unit: 'bag', label: 'Groceries', icon: '🛒' },
    furniture: { factor: 75.0, unit: 'item', label: 'Furniture', icon: '🪑' },
    general: { factor: 5.0, unit: 'item', label: 'General Items', icon: '📦' }
  }
};

export const CATEGORY_INFO = {
  transport: { label: 'Transportation', icon: '🚗', color: '#3b82f6' },
  electricity: { label: 'Electricity', icon: '⚡', color: '#f59e0b' },
  food: { label: 'Food & Diet', icon: '🍽️', color: '#22c55e' },
  shopping: { label: 'Shopping', icon: '🛍️', color: '#a855f7' }
};

export function calculateEmission(category, subcategory, details) {
  const factors = EMISSION_FACTORS[category];
  if (!factors || !factors[subcategory]) return 0;

  const { factor } = factors[subcategory];
  let quantity = 0;

  switch (category) {
    case 'transport': quantity = details.distance || 0; break;
    case 'electricity': quantity = details.quantity || 0; break;
    case 'food': quantity = details.quantity || 1; break;
    case 'shopping': quantity = details.quantity || 1; break;
    default: quantity = details.quantity || 0;
  }

  return Math.round(factor * quantity * 100) / 100;
}
