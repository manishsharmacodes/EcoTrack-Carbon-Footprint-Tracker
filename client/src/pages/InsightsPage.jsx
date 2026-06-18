import { useState, useEffect } from 'react';
import { insightsAPI } from '../services/api';
import { HiOutlineBadgeCheck, HiOutlineSparkles, HiOutlineTrendingDown, HiOutlineExclamation, HiOutlineLightBulb } from 'react-icons/hi';
import toast from 'react-hot-toast';
import './Insights.css';

export default function InsightsPage() {
  const [insights, setInsights] = useState([]);
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [insightsRes, tipsRes] = await Promise.all([
        insightsAPI.getAll(),
        insightsAPI.getTips()
      ]);
      setInsights(insightsRes.data);
      setTips(tipsRes.data);
    } catch (e) {
      toast.error('Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  const filteredInsights = insights.filter(item => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  const getImpactBadge = (impact) => {
    switch (impact) {
      case 'high':
        return <span className="badge badge-danger">High Impact</span>;
      case 'medium':
        return <span className="badge badge-warning">Med Impact</span>;
      case 'positive':
        return <span className="badge badge-success">Achievement</span>;
      default:
        return <span className="badge badge-info">Info</span>;
    }
  };

  const getInsightTypeClass = (type) => {
    switch (type) {
      case 'achievement': return 'insight-achievement';
      case 'warning': return 'insight-warning';
      case 'suggestion': return 'insight-suggestion';
      default: return 'insight-info';
    }
  };

  // Calculate total potential savings
  const totalPotentialSavings = insights
    .filter(i => i.potential)
    .reduce((sum, i) => sum + i.potential, 0);

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Insights & Tips</h1>
        </div>
        <div className="insights-skeleton-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 160, borderRadius: 12, marginBottom: 20 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Personalized Insights</h1>
        <p>Smart, data-driven advice based on your logged carbon habits</p>
      </div>

      {totalPotentialSavings > 0 && (
        <div className="glass-card savings-highlight animate-scale">
          <div className="savings-content">
            <span className="savings-sparkle"><HiOutlineSparkles size={28} /></span>
            <div>
              <h3>Potential Carbon Savings</h3>
              <p>By implementing these recommendations, you could reduce your emissions by up to <b>{totalPotentialSavings} kg CO₂</b> per month!</p>
            </div>
          </div>
        </div>
      )}

      <div className="insights-layout">
        {/* Main Insights list */}
        <div className="insights-main-section">
          {/* Filters */}
          <div className="insights-tabs">
            {['all', 'suggestion', 'achievement', 'warning'].map(t => (
              <button
                key={t}
                className={`insights-tab ${filterType === t ? 'active' : ''}`}
                onClick={() => setFilterType(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}s
              </button>
            ))}
          </div>

          <div className="insights-list-wrap">
            {filteredInsights.length > 0 ? (
              filteredInsights.map((item, idx) => (
                <div
                  key={idx}
                  className={`glass-card insight-card ${getInsightTypeClass(item.type)} animate-fade`}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="insight-card-left">
                    <span className="insight-card-icon">{item.icon}</span>
                  </div>
                  <div className="insight-card-body">
                    <div className="insight-card-meta">
                      {getImpactBadge(item.impact)}
                      {item.category && <span className="badge-cat">{item.category}</span>}
                    </div>
                    <h3 className="insight-card-title">{item.title}</h3>
                    <p className="insight-card-msg">{item.message}</p>
                    
                    {item.potential && (
                      <div className="insight-potential-savings">
                        <HiOutlineTrendingDown /> Potential reduction: <b>{item.potential} kg CO₂</b>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state glass-card">
                <div className="empty-icon">💡</div>
                <h3>No Insights Found</h3>
                <p>There are currently no matching suggestions in this category. Keep tracking to generate more suggestions!</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Tips of the day */}
        <div className="insights-sidebar-section">
          <div className="glass-card daily-tips-card">
            <h3>💡 Daily Eco Tips</h3>
            <div className="sidebar-tips-list">
              {tips.map((tip, idx) => (
                <div key={idx} className="sidebar-tip-item animate-fade">
                  <div className="tip-header-row">
                    <span className="tip-card-icon">{tip.icon}</span>
                    <h4>{tip.title}</h4>
                  </div>
                  <p className="tip-card-desc">{tip.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
