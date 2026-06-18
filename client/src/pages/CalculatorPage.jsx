import { useState, useEffect } from 'react';
import { EMISSION_FACTORS, CATEGORY_INFO } from '../utils/emissionFactors';
import { formatCO2 } from '../utils/formatters';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { HiOutlineSparkles, HiOutlineLightBulb } from 'react-icons/hi';
import './Calculator.css';

export default function CalculatorPage() {
  // Lifestyle state (weekly averages)
  const [carKm, setCarKm] = useState(100);
  const [fuelType, setFuelType] = useState('car_petrol');
  const [busKm, setBusKm] = useState(20);
  const [trainKm, setTrainKm] = useState(10);
  const [flightKm, setFlightKm] = useState(0); // monthly flight km converted to weekly

  const [electricityKwh, setElectricityKwh] = useState(150); // monthly kWh
  const [electricityType, setElectricityType] = useState('grid');

  const [nonVegMeals, setNonVegMeals] = useState(7); // meals per week
  const [vegMeals, setVegMeals] = useState(10);
  const [veganMeals, setVeganMeals] = useState(4);

  const [clothingItems, setClothingItems] = useState(1); // items per month
  const [electronicsItems, setElectronicsItems] = useState(0);
  const [groceryBags, setGroceryBags] = useState(15);

  const [results, setResults] = useState({
    transport: 0,
    electricity: 0,
    food: 0,
    shopping: 0,
    total: 0
  });

  // Calculate emissions whenever state variables change
  useEffect(() => {
    // 1. Transport (weekly kg CO2)
    const transportVal =
      carKm * (EMISSION_FACTORS.transport[fuelType]?.factor || 0) +
      busKm * (EMISSION_FACTORS.transport.bus?.factor || 0) +
      trainKm * (EMISSION_FACTORS.transport.train?.factor || 0) +
      (flightKm / 4.3) * (EMISSION_FACTORS.transport.flight_domestic?.factor || 0);

    // 2. Electricity (weekly kg CO2: monthly / 4.3)
    const electricityVal =
      (electricityKwh * (EMISSION_FACTORS.electricity[electricityType]?.factor || 0)) / 4.3;

    // 3. Food (weekly kg CO2)
    const foodVal =
      nonVegMeals * (EMISSION_FACTORS.food.non_veg?.factor || 0) +
      vegMeals * (EMISSION_FACTORS.food.vegetarian?.factor || 0) +
      veganMeals * (EMISSION_FACTORS.food.vegan?.factor || 0);

    // 4. Shopping (weekly kg CO2: monthly / 4.3)
    const shoppingVal =
      (clothingItems * (EMISSION_FACTORS.shopping.clothing?.factor || 0) +
       electronicsItems * (EMISSION_FACTORS.shopping.electronics?.factor || 0) +
       groceryBags * (EMISSION_FACTORS.shopping.groceries?.factor || 0)) / 4.3;

    const total = transportVal + electricityVal + foodVal + shoppingVal;

    setResults({
      transport: Math.round(transportVal * 10) / 10,
      electricity: Math.round(electricityVal * 10) / 10,
      food: Math.round(foodVal * 10) / 10,
      shopping: Math.round(shoppingVal * 10) / 10,
      total: Math.round(total * 10) / 10
    });
  }, [
    carKm, fuelType, busKm, trainKm, flightKm,
    electricityKwh, electricityType,
    nonVegMeals, vegMeals, veganMeals,
    clothingItems, electronicsItems, groceryBags
  ]);

  const pieData = [
    { name: 'Transport', value: results.transport, color: CATEGORY_INFO.transport.color },
    { name: 'Electricity', value: results.electricity, color: CATEGORY_INFO.electricity.color },
    { name: 'Food', value: results.food, color: CATEGORY_INFO.food.color },
    { name: 'Shopping', value: results.shopping, color: CATEGORY_INFO.shopping.color }
  ].filter(d => d.value > 0);

  // Benchmarks: 112 kg CO2/week is the US average, 32 kg/week is world average
  const benchmarkData = [
    { name: 'Your Footprint', value: results.total, fill: 'var(--primary-light)' },
    { name: 'World Avg (Weekly)', value: 32, fill: 'var(--text-muted)' },
    { name: 'US Avg (Weekly)', value: 112, fill: 'var(--danger)' }
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Carbon Calculator</h1>
        <p>Estimate your weekly carbon footprint by adjusting your lifestyle factors</p>
      </div>

      <div className="calc-layout">
        {/* Sliders Input Form */}
        <div className="glass-card calc-form">
          {/* Section: Transport */}
          <div className="calc-section">
            <h3 className="section-title" style={{ borderColor: CATEGORY_INFO.transport.color }}>
              🚗 Transportation
            </h3>
            <div className="section-fields">
              <div className="form-group">
                <label className="form-label">Car commute (km / week): {carKm} km</label>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="10"
                  className="slider"
                  value={carKm}
                  onChange={e => setCarKm(parseInt(e.target.value))}
                />
              </div>

              {carKm > 0 && (
                <div className="form-group animate-fade">
                  <label className="form-label">Car Fuel Type</label>
                  <select
                    className="form-select"
                    value={fuelType}
                    onChange={e => setFuelType(e.target.value)}
                  >
                    <option value="car_petrol">Petrol</option>
                    <option value="car_diesel">Diesel</option>
                    <option value="car_electric">Electric</option>
                  </select>
                </div>
              )}

              <div className="grid-2 gap-md">
                <div className="form-group">
                  <label className="form-label">Bus travel: {busKm} km/week</label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="5"
                    className="slider"
                    value={busKm}
                    onChange={e => setBusKm(parseInt(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Train travel: {trainKm} km/week</label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="5"
                    className="slider"
                    value={trainKm}
                    onChange={e => setTrainKm(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Flights (km / month): {flightKm} km</label>
                <input
                  type="range"
                  min="0"
                  max="5000"
                  step="100"
                  className="slider"
                  value={flightKm}
                  onChange={e => setFlightKm(parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Section: Electricity */}
          <div className="calc-section">
            <h3 className="section-title" style={{ borderColor: CATEGORY_INFO.electricity.color }}>
              ⚡ Electricity
            </h3>
            <div className="section-fields">
              <div className="form-group">
                <label className="form-label">Home Usage: {electricityKwh} kWh / month</label>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="20"
                  className="slider"
                  value={electricityKwh}
                  onChange={e => setElectricityKwh(parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Power Source</label>
                <select
                  className="form-select"
                  value={electricityType}
                  onChange={e => setElectricityType(e.target.value)}
                >
                  <option value="grid">Grid (Fossil Fuels + Mixed)</option>
                  <option value="solar">Solar (100% Renewable)</option>
                  <option value="wind">Wind</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Food */}
          <div className="calc-section">
            <h3 className="section-title" style={{ borderColor: CATEGORY_INFO.food.color }}>
              🍽️ Food habits (Meals / week)
            </h3>
            <div className="section-fields">
              <div className="form-group">
                <label className="form-label">Meat / Poultry meals: {nonVegMeals}</label>
                <input
                  type="range"
                  min="0"
                  max="21"
                  className="slider"
                  value={nonVegMeals}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    setNonVegMeals(val);
                    if (val + vegMeals + veganMeals > 21) {
                      setVegMeals(Math.max(0, 21 - val - veganMeals));
                    }
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Vegetarian meals (dairy but no meat): {vegMeals}</label>
                <input
                  type="range"
                  min="0"
                  max="21"
                  className="slider"
                  value={vegMeals}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    setVegMeals(val);
                    if (val + nonVegMeals + veganMeals > 21) {
                      setNonVegMeals(Math.max(0, 21 - val - veganMeals));
                    }
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Vegan meals: {veganMeals}</label>
                <input
                  type="range"
                  min="0"
                  max="21"
                  className="slider"
                  value={veganMeals}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    setVeganMeals(val);
                    if (val + nonVegMeals + vegMeals > 21) {
                      setVegMeals(Math.max(0, 21 - val - nonVegMeals));
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section: Shopping */}
          <div className="calc-section">
            <h3 className="section-title" style={{ borderColor: CATEGORY_INFO.shopping.color }}>
              🛍️ Shopping Behavior
            </h3>
            <div className="section-fields">
              <div className="grid-2 gap-md">
                <div className="form-group">
                  <label className="form-label">Clothes purchased: {clothingItems} / month</label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    className="slider"
                    value={clothingItems}
                    onChange={e => setClothingItems(parseInt(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Electronics purchased: {electronicsItems} / month</label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    className="slider"
                    value={electronicsItems}
                    onChange={e => setElectronicsItems(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Groceries consumed: {groceryBags} bags / month</label>
                <input
                  type="range"
                  min="0"
                  max="40"
                  className="slider"
                  value={groceryBags}
                  onChange={e => setGroceryBags(parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Card */}
        <div className="results-panel">
          {/* Total score ring */}
          <div className="glass-card result-score-card text-center">
            <span className="sparkle-icon">✨</span>
            <div className="big-score">
              <h2>{results.total}</h2>
              <span>kg CO₂ / week</span>
            </div>
            <p className="score-desc">
              Your footprint is equivalent to driving a petrol car about <b>{Math.round(results.total / 0.21)} km</b>.
            </p>
          </div>

          {/* Pie Chart Card */}
          <div className="glass-card result-chart-card">
            <h3>Emissions Breakdown</h3>
            <div className="calc-pie-wrap">
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        innerRadius={45} outerRadius={65}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v} kg`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="empty-state">No emissions details</div>
              )}
              </div>

              <div className="calc-legend">
                {pieData.map((item, idx) => (
                  <div key={idx} className="calc-legend-item">
                    <span className="legend-dot" style={{ background: item.color }} />
                    <span className="legend-lbl">{item.name}</span>
                    <span className="legend-val">{item.value} kg</span>
                  </div>
                ))}
              </div>
          </div>

          {/* Benchmark comparison */}
          <div className="glass-card result-chart-card">
            <h3>Comparison (kg CO₂/week)</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={benchmarkData} layout="vertical" margin={{ left: -25, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsla(0,0%,100%,0.05)" />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={11} width={80} />
                <Tooltip formatter={(v) => [`${v} kg CO₂`, '']} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                  {benchmarkData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Eco Tip */}
          <div className="glass-card eco-tip-banner">
            <span className="tip-bulb"><HiOutlineLightBulb size={24} /></span>
            <div>
              <h4>Did you know?</h4>
              <p>
                {results.transport > results.food 
                  ? 'Your transport emissions are your biggest impact. Switching to public transit or cycling just one day a week can reduce your footprint significantly!' 
                  : 'Your diet/food emissions are highly impactful. Substituting red meat for plant-based alternatives on just a couple of meals can cut your footprint by over 20 kg CO₂/week!'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
