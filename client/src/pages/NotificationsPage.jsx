import { useState, useEffect } from 'react';
import { notificationsAPI } from '../services/api';
import { formatRelativeTime } from '../utils/formatters';
import { HiOutlineBell, HiOutlineCheckCircle, HiOutlineVolumeUp, HiOutlineLightBulb, HiOutlineStar } from 'react-icons/hi';
import toast from 'react-hot-toast';
import './Notifications.css';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationsAPI.getAll();
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (e) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      // Update local state
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(c => Math.max(0, c - 1));
    } catch (e) {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (e) {
      toast.error('Failed to mark notifications as read');
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'tip': return <HiOutlineLightBulb size={20} className="notif-type-icon type-tip" />;
      case 'achievement': return <HiOutlineStar size={20} className="notif-type-icon type-achievement" />;
      case 'milestone': return <HiOutlineCheckCircle size={20} className="notif-type-icon type-milestone" />;
      default: return <HiOutlineVolumeUp size={20} className="notif-type-icon type-reminder" />;
    }
  };

  return (
    <div className="page">
      <div className="page-header notif-page-header">
        <div>
          <h1>Notifications</h1>
          <p>Stay updated on your green achievements and streak reminders</p>
        </div>
        
        {unreadCount > 0 && (
          <button
            className="btn btn-secondary btn-sm mark-all-read-btn"
            onClick={handleMarkAllRead}
          >
            Mark all read <HiOutlineCheckCircle />
          </button>
        )}
      </div>

      <div className="notifications-container animate-scale">
        {loading ? (
          <div className="notifications-skeleton">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ height: 74, marginBottom: 12, borderRadius: 8 }} />
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <div className="notifications-feed">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                className={`glass-card notification-item ${notif.read ? 'read' : 'unread'} animate-fade`}
                onClick={() => !notif.read && handleMarkRead(notif._id)}
              >
                <div className="notif-item-left">
                  {getNotifIcon(notif.type)}
                </div>
                <div className="notif-item-body">
                  <div className="notif-item-header">
                    <h4 className="notif-title">{notif.title}</h4>
                    <span className="notif-time">{formatRelativeTime(notif.createdAt)}</span>
                  </div>
                  <p className="notif-message">{notif.message}</p>
                </div>
                {!notif.read && (
                  <div className="notif-unread-dot" title="Unread" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state glass-card">
            <div className="empty-icon"><HiOutlineBell size={42} /></div>
            <h3>All Caught Up!</h3>
            <p>You have no notifications at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
