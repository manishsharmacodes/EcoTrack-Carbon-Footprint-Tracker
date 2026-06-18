import { useState, useEffect } from 'react';
import { goalsAPI } from '../services/api';
import { CATEGORY_INFO } from '../utils/emissionFactors';
import { formatDate, getDaysRemaining, formatCO2 } from '../utils/formatters';
import { HiOutlineFlag, HiOutlineTrash, HiOutlineCalendar, HiOutlinePlus } from 'react-icons/hi';
import toast from 'react-hot-toast';
import './Goals.css';

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('overall');
  const [targetReduction, setTargetReduction] = useState(15);
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const res = await goalsAPI.getAll();
      setGoals(res.data);
    } catch (e) {
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!endDate) {
      toast.error('Please select a target date');
      return;
    }
    if (new Date(endDate) <= new Date()) {
      toast.error('End date must be in the future');
      return;
    }

    setSubmitting(true);
    try {
      await goalsAPI.create({
        title,
        description,
        category,
        targetReduction: parseFloat(targetReduction),
        endDate
      });
      toast.success('Goal set successfully! 🎯');
      setTitle('');
      setDescription('');
      setCategory('overall');
      setTargetReduction(15);
      setEndDate('');
      loadGoals();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    try {
      await goalsAPI.delete(id);
      toast.success('Goal deleted');
      loadGoals();
    } catch (error) {
      toast.error('Failed to delete goal');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-success">Completed</span>;
      case 'failed':
        return <span className="badge badge-danger">Failed</span>;
      default:
        return <span className="badge badge-info">Active</span>;
    }
  };

  const getCategoryDetails = (catKey) => {
    if (catKey === 'overall') {
      return { label: 'Overall Emissions', icon: '🌍', color: '#10b981' };
    }
    return CATEGORY_INFO[catKey] || { label: catKey, icon: '🎯', color: '#666' };
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Reduction Goals</h1>
        <p>Set targets to lower your carbon emissions and track your success</p>
      </div>

      <div className="goals-grid">
        {/* Goal Form Card */}
        <div className="glass-card goal-form-card animate-scale">
          <div className="card-header">
            <h3>Set New Goal</h3>
          </div>

          <form onSubmit={handleSubmit} className="goal-form-wrap">
            <div className="form-group">
              <label className="form-label">Goal Title</label>
              <input
                id="goal-title"
                type="text"
                className="form-input"
                placeholder="e.g. Reduce commuting emissions"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <input
                id="goal-desc"
                type="text"
                className="form-input"
                placeholder="e.g. Walk to the grocery store, bike to work"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={150}
              />
            </div>

            <div className="grid-2 gap-md">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  id="goal-category"
                  className="form-select"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  required
                >
                  <option value="overall">Overall Footprint</option>
                  <option value="transport">Transportation</option>
                  <option value="electricity">Electricity</option>
                  <option value="food">Food & Diet</option>
                  <option value="shopping">Shopping</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Reduction Target (%)</label>
                <input
                  id="goal-target"
                  type="number"
                  className="form-input"
                  min="1"
                  max="100"
                  value={targetReduction}
                  onChange={e => setTargetReduction(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Target Date</label>
              <div className="input-icon-wrap">
                <HiOutlineCalendar className="input-icon" />
                <input
                  id="goal-end-date"
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="goal-baseline-note">
              <p>💡 <b>Note:</b> Your baseline emissions will be calculated automatically based on your activity over the last 30 days.</p>
            </div>

            <button
              id="goal-submit"
              type="submit"
              className="btn btn-primary btn-lg submit-goal-btn"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Set Target'} <HiOutlinePlus />
            </button>
          </form>
        </div>

        {/* Goals List Card */}
        <div className="goals-list-card animate-scale">
          <div className="list-header">
            <h3>Active Targets ({goals.filter(g => g.status === 'active').length})</h3>
          </div>

          <div className="goals-list-body">
            {loading ? (
              <div className="goals-skeleton-list">
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton skeleton-row" style={{ height: 130, marginBottom: 16 }} />
                ))}
              </div>
            ) : goals.length > 0 ? (
              <div className="goals-container-list">
                {goals.map((goal) => {
                  const cat = getCategoryDetails(goal.category);
                  const daysLeft = getDaysRemaining(goal.endDate);
                  const isSuccess = goal.status === 'completed';
                  
                  return (
                    <div key={goal._id} className={`glass-card goal-item-card status-${goal.status} animate-fade`}>
                      <div className="goal-item-top-row">
                        <div className="goal-item-title-section">
                          <span className="goal-item-icon" style={{ background: `${cat.color}1a`, color: cat.color }}>
                            {cat.icon}
                          </span>
                          <div>
                            <h4 className="goal-item-title">{goal.title}</h4>
                            <p className="goal-item-desc-text">{goal.description || `Reduce ${cat.label.toLowerCase()} emissions`}</p>
                          </div>
                        </div>
                        <div className="goal-item-badge-actions">
                          {getStatusBadge(goal.status)}
                          <button
                            className="btn-delete-goal"
                            onClick={() => handleDelete(goal._id)}
                            title="Delete Target"
                          >
                            <HiOutlineTrash size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="goal-progress-section">
                        <div className="goal-progress-header">
                          <span className="goal-progress-label">Progress: {goal.progress}%</span>
                          <span className="goal-target-lbl">Target: -{goal.targetReduction}%</span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${goal.progress}%`,
                              background: isSuccess ? 'var(--success)' : `linear-gradient(90deg, ${cat.color}, var(--primary-light))`
                            }}
                          />
                        </div>
                      </div>

                      {/* Detail metrics */}
                      <div className="goal-metrics-row">
                        <div className="goal-metric">
                          <span className="metric-lbl">Baseline</span>
                          <span className="metric-val">{formatCO2(goal.baselineEmission)}</span>
                        </div>
                        <div className="goal-metric">
                          <span className="metric-lbl">Current</span>
                          <span className="metric-val">{formatCO2(goal.currentEmission || 0)}</span>
                        </div>
                        <div className="goal-metric">
                          <span className="metric-lbl">Target</span>
                          <span className="metric-val">
                            {formatCO2(goal.baselineEmission * (1 - goal.targetReduction / 100))}
                          </span>
                        </div>
                        <div className="goal-metric text-right">
                          <span className="metric-lbl">Timeline</span>
                          <span className="metric-val timeline-val">
                            {goal.status === 'active' 
                              ? `${daysLeft} days left` 
                              : `Ended ${formatDate(goal.endDate)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state glass-card">
                <div className="empty-icon"><HiOutlineFlag size={42} /></div>
                <h3>No Targets Configured</h3>
                <p>Configure a new target on the left to start pushing for carbon reductions!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
