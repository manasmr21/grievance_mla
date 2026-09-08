import React from 'react';
import NotificationListItem from './NotificationListItem';

const NotificationList = ({
  notifications,
  onItemClick,
  emptyMessage = 'No notifications to display.',
  compact = false,
}) => {
  if (!notifications.length) {
    return (
      <div style={{ textAlign: 'center', color: '#64748b', padding: compact ? '16px 8px' : '40px 20px', fontSize: compact ? '13px' : '15px' }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={compact ? 'notification-list-compact' : 'notifications-list'}>
      {notifications.map((n) => (
        <NotificationListItem
          key={n.id}
          notification={n}
          onClick={onItemClick}
          compact={compact}
        />
      ))}
    </div>
  );
};

export default NotificationList;
