import { useState, useEffect } from 'react';
import { dashboardAPI, insightsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCO2 } from '../utils/formatters';
import { CATEGORY_INFO } from '../utils/emissionFactors';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { HiOutlineTrendingDown, HiOutlineTrendingUp, HiOutlineGlobe, HiOutlineLightningBolt } from 'react-icons/hi';
import './Dashboard.css';

const CHART_COLORS = ['#3b82f6', '#f59e0b', '#22c55e', '#a855f7'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [progress, setProgress] = useState([]);
  const [tips, setTips] = useState([]);
  const [chartPeriod, setChartPeriod] = useState('weekly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    loadChartData();
  }, [chartPeriod]);

  const loadDashboard = async () => {
    try {
      const [statsRes, progressRes, tipsRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getProgress(),
        insightsAPI.getTips()
      ]);
      setStats(statsRes.data);
      setProgress(progressRes.data);
      setTips(tipsRes.data);
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    try {
      const res = await dashboardAPI.getChartData(chartPeriod);
      setChartData(res.data);
    } catch (error) {
      console.error('Chart data error:', error);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="dashboard-skeleton">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />
          ))}
          <div className="skeleton" style={{ height: 320, borderRadius: 12, gridColumn: '1 / -1' }} />
        </div>
      </div>
    );
  }

  const scorePercent = stats?.carbonScore?.score || 0;
  const scoreLevel = stats?.carbonScore?.level || 'low';
  const scoreColor = stats?.carbonScore?.color || '#22c55e';

  // Prepare pie data
  const pieData = stats?.categoryBreakdown?.map(c => ({
    name: CATEGORY_INFO[c.category]?.label || c.category,
    value: c.total,
    color: CATEGORY_INFO[c.category]?.color || '#666'
  })) || [];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p>Here&apos;s your carbon footprint overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-4 dashboard-stats">
        {/* Carbon Score */}
        <div className="glass-card stat-card carbon-score-card">
          <div className="carbon-score-ring" style={{ '--score-color': scoreColor, '--score-percent': scorePercent }}>
            <svg viewBox="0 0 120 120" className="score-svg">
              <circle cx="60" cy="60" r="52" className="score-bg" />
              <circle
                cx="60" cy="60" r="52"
                className="score-fill"
                style={{
                  strokeDasharray: `${scorePercent * 3.27} 327`,
                  stroke: scoreColor
                }}
              />
            </svg>
            <div className="score-value">
              <span className="score-number">{Math.round(scorePercent)}</span>
              <span className="score-label">{stats?.carbonScore?.label}</span>
            </div>
          </div>
          <p className="stat-label">Carbon Score</p>
        </div>

        {/* Daily Emissions */}
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'hsla(152, 68%, 48%, 0.15)', color: 'var(--primary-light)' }}>
            <HiOutlineTrendingDown size={22} />
          </div>
          <div className="stat-value">{formatCO2(stats?.dailyEmission || 0)}</div>
          <p className="stat-label">Today&apos;s Emissions</p>
          <span className={`badge ${stats?.averageComparison?.percentDiff < 0 ? 'badge-success' : 'badge-danger'}`}>
            {stats?.averageComparison?.percentDiff < 0 ? '↓' : '↑'} {Math.abs(stats?.averageComparison?.percentDiff || 0)}% vs avg
          </span>
        </div>

        {/* Monthly Total */}
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'hsla(200, 80%, 55%, 0.15)', color: 'var(--info)' }}>
            <HiOutlineGlobe size={22} />
          </div>
          <div className="stat-value">{formatCO2(stats?.monthlyTotal || 0)}</div>
          <p className="stat-label">This Month</p>
          <span className="badge badge-info">{stats?.totalActivities || 0} activities</span>
        </div>

        {/* Trees Needed */}
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'hsla(38, 92%, 55%, 0.15)', color: 'var(--warning)' }}>
            <HiOutlineLightningBolt size={22} />
          </div>
          <div className="stat-value">{stats?.treesNeeded || 0}</div>
          <p className="stat-label">Trees to Offset</p>
          <span className="badge badge-warning">per year</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="dashboard-charts">
        {/* Emissions Over Time */}
        <div className="glass-card chart-card">
          <div className="chart-header">
            <h3>Emissions Over Time</h3>
            <div className="tabs chart-tabs">
              {['daily', 'weekly', 'monthly'].map(p => (
                <button
                  key={p}
                  className={`tab ${chartPeriod === p ? 'active' : ''}`}
                  onClick={() => setChartPeriod(p)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-body">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary-light)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary-light)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsla(0,0%,100%,0.05)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickFormatter={d => d.slice(-5)} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                      fontSize: 13
                    }}
                    formatter={(v) => [`${v.toFixed(2)} kg CO₂`, '']}
                    labelFormatter={(l) => `Date: ${l}`}
                  />
                  <Area
                    type="monotone" dataKey="total" stroke="var(--primary-light)"
                    strokeWidth={2} fill="url(#colorTotal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>No Data Yet</h3>
                <p>Start logging activities to see your emission trends</p>
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="glass-card chart-card pie-card">
          <div className="chart-header">
            <h3>By Category</h3>
          </div>
          <div className="chart-body pie-body">
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={80}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 8,
                        color: 'var(--text-primary)',
                        fontSize: 13
                      }}
                      formatter={(v) => [`${v.toFixed(2)} kg CO₂`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-legend">
                  {pieData.map((entry, i) => (
                    <div key={i} className="pie-legend-item">
                      <span className="legend-dot" style={{ background: entry.color }} />
                      <span className="legend-label">{entry.name}</span>
                      <span className="legend-value">{formatCO2(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🥧</div>
                <p>No category data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress + Tips Row */}
      <div className="dashboard-bottom">
        {/* Category Progress */}
        <div className="glass-card progress-card">
          <h3>Monthly Progress</h3>
          <div className="progress-list">
            {progress.map((p) => (
              <div key={p.category} className="progress-item">
                <div className="progress-item-header">
                  <span className="progress-category">
                    {CATEGORY_INFO[p.category]?.icon} {CATEGORY_INFO[p.category]?.label}
                  </span>
                  <span className={`progress-change ${p.improved ? 'improved' : 'worsened'}`}>
                    {p.change > 0 ? '+' : ''}{p.change}%
                    {p.improved ? <HiOutlineTrendingDown size={14} /> : p.change > 0 ? <HiOutlineTrendingUp size={14} /> : null}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min(100, p.previous > 0 ? (p.current / p.previous) * 100 : 0)}%`,
                      background: CATEGORY_INFO[p.category]?.color
                    }}
                  />
                </div>
                <div className="progress-values">
                  <span>{formatCO2(p.current)}</span>
                  <span className="progress-prev">prev: {formatCO2(p.previous)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Eco Tips */}
        <div className="glass-card tips-card">
          <h3>💡 Eco Tips</h3>
          <div className="tips-list">
            {tips.map((tip, i) => (
              <div key={i} className="tip-item animate-fade" style={{ animationDelay: `${i * 0.1}s` }}>
                <span className="tip-icon">{tip.icon}</span>
                <div>
                  <h4>{tip.title}</h4>
                  <p>{tip.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
