import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import PaginationPageNumbers from '../UI/PaginationPageNumbers';
import NotificationList from './NotificationList';
import { NOTIFICATIONS_ROLE_CONFIG } from '../../utils/notificationMeta';
import '../../styles/student-pages.css';
import '../../styles/Notifications.css';
import '../../styles/admin/AdminShared.css';

const NotificationsPage = ({ role = 'staff' }) => {
  const config = NOTIFICATIONS_ROLE_CONFIG[role] || NOTIFICATIONS_ROLE_CONFIG.staff;
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();

  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  const totalNotifications = filteredNotifications.length;
  const totalPages = config.paginated
    ? Math.ceil(totalNotifications / config.pageSize) || 1
    : 1;

  const visibleNotifications = useMemo(() => {
    if (!config.paginated) return filteredNotifications;
    const start = (page - 1) * config.pageSize;
    return filteredNotifications.slice(start, start + config.pageSize);
  }, [filteredNotifications, page, config.paginated, config.pageSize]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const handleNotificationClick = async (n) => {
    await markAsRead(n.id);
    config.onNavigate(n, navigate);
  };

  return (
    <div className={`${config.pageClass} notifications-page`}>
      <header className="notifications-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        {unreadCount > 0 && (
          <button type="button" className="send-btn-blue" onClick={markAllRead} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}>
            Mark all as read
          </button>
        )}
      </header>

      <div className="notifications-container dashboard-card">
        <div className="notifications-tabs">
          <button type="button" className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
            All <span className="badge">{notifications.length}</span>
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'unread' ? 'active' : ''}`} onClick={() => setActiveTab('unread')}>
            Unread <span className="badge">{unreadCount}</span>
          </button>
        </div>

        <NotificationList notifications={visibleNotifications} onItemClick={handleNotificationClick} />

        {config.paginated && totalPages > 1 && (
          <div className="cm-pagination" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
            <div className="cm-page-info">
              Showing {(page - 1) * config.pageSize + 1} to {Math.min(page * config.pageSize, totalNotifications)} of {totalNotifications} notifications
            </div>
            <div className="cm-page-controls">
              <button type="button" className="cm-page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Previous page">
                <i className="fa-solid fa-chevron-left" />
              </button>
              <PaginationPageNumbers page={page} totalPages={totalPages} onPageChange={setPage} buttonClassName="cm-page-btn" />
              <button type="button" className="cm-page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="Next page">
                <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
