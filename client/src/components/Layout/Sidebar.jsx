import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI } from '../../services/api';
import { useEffect } from 'react';
import {
  HiOutlineHome, HiOutlineClipboardList, HiOutlineCalculator,
  HiOutlineLightBulb, HiOutlineStar, HiOutlineFlag,
  HiOutlineBell, HiOutlineUser, HiOutlineLogout, HiOutlineMenu, HiOutlineX
} from 'react-icons/hi';
import './Layout.css';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
  { path: '/activities', label: 'Activities', icon: HiOutlineClipboardList },
  { path: '/calculator', label: 'Calculator', icon: HiOutlineCalculator },
  { path: '/insights', label: 'Insights', icon: HiOutlineLightBulb },
  { path: '/gamification', label: 'Achievements', icon: HiOutlineStar },
  { path: '/goals', label: 'Goals', icon: HiOutlineFlag },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await notificationsAPI.getAll();
      setUnreadCount(res.data.unreadCount);
    } catch (e) { /* silent */ }
  };

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div className="sidebar-overlay" onClick={onToggle} />
      )}

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        {/* Logo */}
        <div className="sidebar-header">
          <Link to="/dashboard" className="sidebar-logo">
            <span className="logo-icon">🌿</span>
            {!collapsed && <span className="logo-text">EcoTrack</span>}
          </Link>
          <button className="sidebar-toggle" onClick={onToggle}>
            {collapsed ? <HiOutlineMenu size={20} /> : <HiOutlineX size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
              title={collapsed ? item.label : ''}
            >
              <item.icon size={20} />
              {!collapsed && <span>{item.label}</span>}
              {item.path === '/notifications' && unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="sidebar-footer">
          <Link
            to="/notifications"
            className={`sidebar-link ${location.pathname === '/notifications' ? 'active' : ''}`}
          >
            <div className="notification-icon-wrap">
              <HiOutlineBell size={20} />
              {unreadCount > 0 && <span className="notif-dot" />}
            </div>
            {!collapsed && <span>Notifications</span>}
          </Link>
          <Link
            to="/profile"
            className={`sidebar-link ${location.pathname === '/profile' ? 'active' : ''}`}
          >
            <HiOutlineUser size={20} />
            {!collapsed && <span>{user?.name || 'Profile'}</span>}
          </Link>
          <button className="sidebar-link logout-btn" onClick={logout}>
            <HiOutlineLogout size={20} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
