import { useState, useEffect } from 'react';
import { gamificationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlineFire, HiOutlineAcademicCap, HiOutlineTrophy, HiOutlineLockClosed } from 'react-icons/hi2';
import { formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';
import './Gamification.css';

export default function GamificationPage() {
  const { user } = useAuth();
  const [streak, setStreak] = useState(null);
  const [badges, setBadges] = useState({ earned: [], available: [], total: 0, earnedCount: 0 });
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('badges'); // 'badges' or 'leaderboard'

  useEffect(() => {
    loadGamificationData();
  }, []);

  const loadGamificationData = async () => {
    setLoading(true);
    try {
      const [streakRes, badgesRes, leaderboardRes] = await Promise.all([
        gamificationAPI.getStreak(),
        gamificationAPI.getBadges(),
        gamificationAPI.getLeaderboard()
      ]);
      setStreak(streakRes.data);
      setBadges(badgesRes.data);
      setLeaderboard(leaderboardRes.data.leaderboard);
      setUserRank(leaderboardRes.data.userRank);
    } catch (e) {
      toast.error('Failed to load gamification data');
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank) => {
    switch (rank) {
      case 1: return <span className="rank-badge gold">🏆 1st</span>;
      case 2: return <span className="rank-badge silver">🥈 2nd</span>;
      case 3: return <span className="rank-badge bronze">🥉 3rd</span>;
      default: return <span className="rank-num">#{rank}</span>;
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Achievements & Leaderboard</h1>
        </div>
        <div className="skeleton-grid grid-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 140, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  // Combine badges for unified grid view
  const combinedBadges = [
    ...badges.earned.map(b => ({ ...b, locked: false })),
    ...badges.available.map(b => ({ ...b, locked: true }))
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Achievements</h1>
        <p>Unlock eco-badges, build daily habits, and climb the green leaderboard</p>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-3 gamification-stats">
        {/* Current Streak */}
        <div className="glass-card stat-card streak-card">
          <div className="stat-icon" style={{ background: 'hsla(15, 100%, 54%, 0.15)', color: 'hsl(15, 100%, 54%)' }}>
            <HiOutlineFire className="streak-icon-fire" size={24} />
          </div>
          <div className="stat-value">{streak?.current || 0} Days</div>
          <p className="stat-label">Current Streak</p>
          <span className="badge badge-warning">Longest: {streak?.longest || 0} days</span>
        </div>

        {/* Badges Progress */}
        <div className="glass-card stat-card badges-progress-card">
          <div className="stat-icon" style={{ background: 'hsla(45, 93%, 58%, 0.15)', color: 'var(--accent)' }}>
            <HiOutlineAcademicCap size={24} />
          </div>
          <div className="stat-value">{badges.earnedCount} / {badges.total}</div>
          <p className="stat-label">Badges Unlocked</p>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width: `${badges.total > 0 ? (badges.earnedCount / badges.total) * 100 : 0}%`,
                background: 'var(--accent)'
              }}
            />
          </div>
        </div>

        {/* Current Rank */}
        <div className="glass-card stat-card rank-card">
          <div className="stat-icon" style={{ background: 'hsla(200, 80%, 55%, 0.15)', color: 'var(--info)' }}>
            <HiOutlineTrophy size={24} />
          </div>
          <div className="stat-value">
            {userRank ? `#${userRank}` : 'Unranked'}
          </div>
          <p className="stat-label">Leaderboard Rank</p>
          <span className="badge badge-info">Top 20 Eco Citizens</span>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="tabs gamification-tabs">
        <button
          className={`tab ${activeTab === 'badges' ? 'active' : ''}`}
          onClick={() => setActiveTab('badges')}
        >
          Badges & Medals ({badges.earnedCount})
        </button>
        <button
          className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          Leaderboard (30-day Low Emissions)
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="tab-content animate-fade">
        {activeTab === 'badges' ? (
          <div className="badges-section">
            <div className="badges-grid">
              {combinedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className={`glass-card badge-item-card ${badge.locked ? 'locked' : 'earned'}`}
                >
                  <div className="badge-item-top">
                    <span className="badge-item-emoji">{badge.icon}</span>
                    {badge.locked && (
                      <span className="badge-lock-icon">
                        <HiOutlineLockClosed size={16} />
                      </span>
                    )}
                  </div>
                  <h3 className="badge-item-name">{badge.name}</h3>
                  <p className="badge-item-desc">{badge.description}</p>
                  
                  {!badge.locked ? (
                    <div className="badge-earned-date">
                      Earned {formatDate(badge.earnedAt)}
                    </div>
                  ) : (
                    <div className="badge-locked-status">
                      Locked
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="leaderboard-section">
            <div className="glass-card leaderboard-table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>User</th>
                    <th>Streak</th>
                    <th>Badges</th>
                    <th>Activities</th>
                    <th className="text-right">Emissions (30d)</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row) => {
                    const isSelf = row._id.toString() === user?._id?.toString();
                    return (
                      <tr key={row._id} className={isSelf ? 'table-row-self' : ''}>
                        <td>{getRankBadge(row.rank)}</td>
                        <td>
                          <div className="table-user-cell">
                            <span className="table-user-avatar">
                              {row.avatar || row.name.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="table-user-name">
                              {row.name} {isSelf && <span className="self-tag">(You)</span>}
                            </span>
                          </div>
                        </td>
                        <td>
                          {row.streak > 0 ? (
                            <span className="table-streak">
                              <HiOutlineFire color="orange" /> {row.streak}d
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <span className="table-badge-count">
                            🏆 {row.badgeCount}
                          </span>
                        </td>
                        <td>{row.activityCount} logs</td>
                        <td className="text-right table-emission-val">
                          {row.totalEmissions.toFixed(1)} kg CO₂
                        </td>
                      </tr>
                    );
                  })}
                  {leaderboard.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-lg text-muted">
                        No leaderboard data yet. Log activities to initiate ranking.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
