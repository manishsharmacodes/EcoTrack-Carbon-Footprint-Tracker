import { useState } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/formatters';
import { HiOutlineUser, HiOutlineMail, HiOutlineSave, HiOutlineLockClosed } from 'react-icons/hi';
import toast from 'react-hot-toast';
import './Profile.css';

const AVATAR_PRESETS = ['🌲', '🐼', '🚲', '🥦', '⚡', '🌊', '🦊', '🌍'];

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '🌲');
  
  // Settings State
  const [notifications, setNotifications] = useState(user?.settings?.notifications ?? true);
  const [dailyReminder, setDailyReminder] = useState(user?.settings?.dailyReminder ?? true);
  const [unit, setUnit] = useState(user?.settings?.unit || 'metric');

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authAPI.updateProfile({
        name,
        avatar,
        settings: {
          notifications,
          dailyReminder,
          unit
        }
      });
      updateUser(res.data);
      localStorage.setItem('ecotrack_user', JSON.stringify(res.data));
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Profile Settings</h1>
        <p>Manage your account settings, notifications, and app preferences</p>
      </div>

      <div className="profile-layout">
        {/* Profile Card & Stats */}
        <div className="profile-left-column">
          <div className="glass-card profile-card text-center">
            <div className="avatar-preview-wrapper">
              <span className="avatar-large">{avatar}</span>
            </div>
            <h2 className="profile-user-name">{user?.name}</h2>
            <p className="profile-user-email">{user?.email}</p>
            <span className="profile-join-date">Member since {formatDate(user?.joinDate || new Date())}</span>
          </div>

          <div className="glass-card profile-stats-card">
            <h3>Habit Statistics</h3>
            <div className="profile-stats-grid">
              <div className="profile-stat-box">
                <span className="stat-num">{user?.streak?.longest || 0}d</span>
                <span className="stat-lbl">Longest Streak</span>
              </div>
              <div className="profile-stat-box">
                <span className="stat-num">{user?.totalCarbonSaved?.toFixed(0) || 0} kg</span>
                <span className="stat-lbl">CO₂ Reduced</span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="glass-card profile-form-card animate-scale">
          <form onSubmit={handleSubmit} className="profile-form">
            <h3>Edit Account Details</h3>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="input-icon-wrap">
                <HiOutlineUser className="input-icon" />
                <input
                  id="profile-name"
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Avatar Select Presets */}
            <div className="form-group">
              <label className="form-label">Select Avatar Preset</label>
              <div className="avatar-preset-grid">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`preset-btn ${avatar === preset ? 'active' : ''}`}
                    onClick={() => setAvatar(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <hr className="divider" />
            <h3>App Preferences</h3>

            <div className="grid-2 gap-md">
              {/* Unit preference */}
              <div className="form-group">
                <label className="form-label">Measurement System</label>
                <select
                  id="profile-unit"
                  className="form-select"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                >
                  <option value="metric">Metric (km, kg, kWh)</option>
                  <option value="imperial">Imperial (miles, lbs, kWh)</option>
                </select>
              </div>
            </div>

            <div className="preferences-toggles">
              <div className="toggle-group">
                <label className="toggle-label-wrap" htmlFor="pref-notif">
                  <div>
                    <span className="toggle-title">System Notifications</span>
                    <span className="toggle-desc">Receive notices on new achievements and badge milestones</span>
                  </div>
                  <div className="toggle-switch-wrap">
                    <input
                      id="pref-notif"
                      type="checkbox"
                      className="toggle-checkbox"
                      checked={notifications}
                      onChange={e => setNotifications(e.target.checked)}
                    />
                    <span className="toggle-switch-slider" />
                  </div>
                </label>
              </div>

              <div className="toggle-group">
                <label className="toggle-label-wrap" htmlFor="pref-reminder">
                  <div>
                    <span className="toggle-title">Daily Logging Reminder</span>
                    <span className="toggle-desc">Get a friendly reminder notification to log daily activities</span>
                  </div>
                  <div className="toggle-switch-wrap">
                    <input
                      id="pref-reminder"
                      type="checkbox"
                      className="toggle-checkbox"
                      checked={dailyReminder}
                      onChange={e => setDailyReminder(e.target.checked)}
                    />
                    <span className="toggle-switch-slider" />
                  </div>
                </label>
              </div>
            </div>

            <button
              id="profile-submit"
              type="submit"
              className="btn btn-primary btn-lg save-profile-btn"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'} <HiOutlineSave />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
