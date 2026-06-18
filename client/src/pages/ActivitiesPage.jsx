import { useState, useEffect } from 'react';
import { activitiesAPI } from '../services/api';
import { EMISSION_FACTORS, CATEGORY_INFO, calculateEmission } from '../utils/emissionFactors';
import { formatCO2, formatDateShort } from '../utils/formatters';
import { HiOutlineTrash, HiOutlinePlusCircle, HiOutlineFilter, HiOutlineCalendar, HiOutlinePlus, HiOutlineSparkles } from 'react-icons/hi';
import toast from 'react-hot-toast';
import './Activities.css';

export default function ActivitiesPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form State
  const [category, setCategory] = useState('transport');
  const [subcategory, setSubcategory] = useState('car_petrol');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [distance, setDistance] = useState('');
  const [quantity, setQuantity] = useState('');

  // Live emission preview
  const [liveEmission, setLiveEmission] = useState(0);

  useEffect(() => {
    loadActivities();
  }, [filterCategory, page]);

  // Update default subcategory when category changes
  useEffect(() => {
    const subkeys = Object.keys(EMISSION_FACTORS[category]);
    setSubcategory(subkeys[0]);
    setDistance('');
    setQuantity('');
  }, [category]);

  // Recalculate live emission preview
  useEffect(() => {
    const details = {};
    if (category === 'transport') {
      details.distance = parseFloat(distance) || 0;
    } else {
      details.quantity = parseFloat(quantity) || 1;
    }
    const val = calculateEmission(category, subcategory, details);
    setLiveEmission(val);
  }, [category, subcategory, distance, quantity]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const res = await activitiesAPI.getAll({
        category: filterCategory || undefined,
        page,
        limit: 10
      });
      setActivities(res.data.activities);
      setTotalPages(res.data.pagination.pages);
    } catch (error) {
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const details = {};
    if (category === 'transport') {
      if (!distance || parseFloat(distance) <= 0) {
        toast.error('Please enter a valid distance');
        setSubmitting(false);
        return;
      }
      details.distance = parseFloat(distance);
    } else {
      if (category !== 'food' && (!quantity || parseFloat(quantity) <= 0)) {
        toast.error('Please enter a valid quantity');
        setSubmitting(false);
        return;
      }
      details.quantity = parseFloat(quantity) || 1;
    }

    try {
      const res = await activitiesAPI.create({
        category,
        subcategory,
        date,
        details
      });

      toast.success(res.data.message || 'Activity logged successfully! 🌿');
      
      // Reset form (except category/date)
      setDistance('');
      setQuantity('');
      setPage(1);
      loadActivities();

      // Notify about new badges
      if (res.data.newBadges && res.data.newBadges.length > 0) {
        res.data.newBadges.forEach(badge => {
          toast(`Awarded Badge: ${badge.icon} ${badge.name}!`, {
            icon: '🏆',
            duration: 5000,
            style: {
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--accent)'
            }
          });
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to log activity');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) return;
    try {
      await activitiesAPI.delete(id);
      toast.success('Activity deleted');
      loadActivities();
    } catch (error) {
      toast.error('Failed to delete activity');
    }
  };

  const renderDetailsForm = () => {
    const currentSubConfig = EMISSION_FACTORS[category][subcategory];
    const unitLabel = currentSubConfig?.unit || '';

    if (category === 'transport') {
      return (
        <div className="form-group animate-fade">
          <label className="form-label">Distance Travelled ({unitLabel})</label>
          <input
            id="activity-distance"
            type="number"
            className="form-input"
            placeholder="e.g. 15"
            value={distance}
            onChange={e => setDistance(e.target.value)}
            required
            min="0.1"
            step="any"
          />
        </div>
      );
    }

    if (category === 'electricity') {
      return (
        <div className="form-group animate-fade">
          <label className="form-label">Energy Consumed ({unitLabel})</label>
          <input
            id="activity-electricity-quantity"
            type="number"
            className="form-input"
            placeholder="e.g. 45"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            required
            min="0.1"
            step="any"
          />
        </div>
      );
    }

    if (category === 'food') {
      return (
        <div className="form-group animate-fade">
          <label className="form-label">Number of Meals</label>
          <input
            id="activity-food-quantity"
            type="number"
            className="form-input"
            placeholder="e.g. 1"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            min="1"
            step="1"
          />
        </div>
      );
    }

    if (category === 'shopping') {
      return (
        <div className="form-group animate-fade">
          <label className="form-label">Number of Items ({unitLabel}s)</label>
          <input
            id="activity-shopping-quantity"
            type="number"
            className="form-input"
            placeholder="e.g. 2"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            required
            min="1"
            step="1"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Log Activities</h1>
        <p>Track your footprint and make green choices today</p>
      </div>

      <div className="activities-grid">
        {/* Log Form Card */}
        <div className="glass-card activity-log-card animate-scale">
          <div className="card-header">
            <h3>New Activity</h3>
            <span className="live-preview-badge">
              <HiOutlineSparkles /> {formatCO2(liveEmission)} CO₂ est.
            </span>
          </div>

          <form onSubmit={handleSubmit} className="activity-form-wrap">
            {/* Date */}
            <div className="form-group">
              <label className="form-label">Date</label>
              <div className="input-icon-wrap">
                <HiOutlineCalendar className="input-icon" />
                <input
                  id="activity-date"
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Category selection via interactive cards */}
            <div className="form-group">
              <label className="form-label">Category</label>
              <div className="category-options">
                {Object.keys(CATEGORY_INFO).map((catKey) => {
                  const info = CATEGORY_INFO[catKey];
                  const isSelected = category === catKey;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      className={`category-opt-card ${isSelected ? 'active' : ''}`}
                      onClick={() => setCategory(catKey)}
                      style={{ '--cat-color': info.color }}
                    >
                      <span className="cat-opt-icon">{info.icon}</span>
                      <span className="cat-opt-label">{info.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subcategory */}
            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                id="activity-subcategory"
                className="form-select"
                value={subcategory}
                onChange={e => setSubcategory(e.target.value)}
                required
              >
                {Object.keys(EMISSION_FACTORS[category]).map(subKey => (
                  <option key={subKey} value={subKey}>
                    {EMISSION_FACTORS[category][subKey].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic details input */}
            {renderDetailsForm()}

            <button
              id="activity-submit"
              type="submit"
              className="btn btn-primary btn-lg submit-activity-btn"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Log Activity'} <HiOutlinePlus />
            </button>
          </form>
        </div>

        {/* History Card */}
        <div className="glass-card history-card animate-scale">
          <div className="card-header history-header">
            <h3>Activity History</h3>
            
            {/* Filter */}
            <div className="filter-wrap">
              <HiOutlineFilter className="filter-icon" />
              <select
                id="activity-filter"
                className="form-select filter-select"
                value={filterCategory}
                onChange={e => {
                  setFilterCategory(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Categories</option>
                {Object.keys(CATEGORY_INFO).map(catKey => (
                  <option key={catKey} value={catKey}>
                    {CATEGORY_INFO[catKey].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="history-body">
            {loading ? (
              <div className="history-skeleton">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="skeleton skeleton-row" style={{ height: 60, marginBottom: 12 }} />
                ))}
              </div>
            ) : activities.length > 0 ? (
              <>
                <div className="history-list">
                  {activities.map((act) => {
                    const catInfo = CATEGORY_INFO[act.category];
                    const subConfig = EMISSION_FACTORS[act.category]?.[act.subcategory];
                    const icon = subConfig?.icon || catInfo?.icon || '🌱';
                    const name = subConfig?.label || act.subcategory;
                    const dateFormatted = formatDateShort(act.date);
                    
                    let detailsString = '';
                    if (act.category === 'transport') {
                      detailsString = `${act.details.distance} km`;
                    } else if (act.category === 'electricity') {
                      detailsString = `${act.details.quantity} kWh`;
                    } else if (act.category === 'food') {
                      detailsString = `${act.details.quantity || 1} meal${(act.details.quantity || 1) > 1 ? 's' : ''}`;
                    } else if (act.category === 'shopping') {
                      detailsString = `${act.details.quantity || 1} item${(act.details.quantity || 1) > 1 ? 's' : ''}`;
                    }

                    return (
                      <div key={act._id} className="history-item animate-fade">
                        <div className="history-item-left">
                          <span className="history-item-icon" style={{ background: `${catInfo?.color}1a`, color: catInfo?.color }}>
                            {icon}
                          </span>
                          <div>
                            <h4 className="history-item-name">{name}</h4>
                            <p className="history-item-sub">
                              {detailsString} • {dateFormatted}
                            </p>
                          </div>
                        </div>
                        <div className="history-item-right">
                          <span className="history-item-emission">
                            {formatCO2(act.carbonEmission)}
                          </span>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(act._id)}
                            title="Delete Activity"
                          >
                            <HiOutlineTrash size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Prev
                    </button>
                    <span className="pagination-text">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>No Activities Yet</h3>
                <p>Log your first activity to start monitoring your carbon emissions!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
