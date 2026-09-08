import React from 'react';
import { getNotificationMeta } from '../../utils/notificationMeta';
import { formatTime } from '../../utils/formatters';

const NotificationListItem = ({
  notification,
  onClick,
  compact = false,
}) => {
  const meta = getNotificationMeta(notification.type);

  if (compact) {
    return (
      <button
        type="button"
        className="notification-list-item-compact"
        onClick={() => onClick?.(notification)}
        style={{
          display: 'flex',
          gap: '10px',
          padding: '10px 8px',
          border: 'none',
          background: notification.is_read ? 'transparent' : '#f8fafc',
          borderRadius: '8px',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: meta.color === 'blue' ? '#2563eb' : meta.color === 'green' ? '#10b981' : meta.color === 'red' ? '#ef4444' : '#f59e0b',
            marginTop: '6px',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>{notification.title}</div>
          <div style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {notification.message}
          </div>
        </div>
      </button>
    );
  }

  return (
    <article
      className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
      onClick={() => onClick?.(notification)}
      style={{ cursor: onClick ? 'pointer' : undefined }}
    >
      <div className={`notification-icon-wrap ${meta.color}`}>
        <i className={meta.icon} />
      </div>
      <div className="notification-content">
        <div className="notification-main">
          <h3>{notification.title}</h3>
          <p>{notification.message}</p>
        </div>
        <div className="notification-meta">
          <span className="time">{formatTime(notification.createdAt)}</span>
          <span className={`status-dot ${!notification.is_read ? 'active' : ''}`} />
        </div>
      </div>
    </article>
  );
};

export default NotificationListItem;
