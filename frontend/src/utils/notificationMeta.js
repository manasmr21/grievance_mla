/** Notification type → icon and color class */

export const NOTIFICATION_META = {
  STUDENT_REGISTERED: { icon: 'fa-solid fa-user-plus', color: 'blue' },
  GRIEVANCE_CREATED: { icon: 'fa-solid fa-plus', color: 'green' },
  GRIEVANCE_ASSIGNED: { icon: 'fa-solid fa-users', color: 'blue' },
  GRIEVANCE_REOPENED: { icon: 'fa-solid fa-rotate-left', color: 'red' },
  GRIEVANCE_UPDATED: { icon: 'fa-solid fa-triangle-exclamation', color: 'orange' },
};

export const getNotificationMeta = (type) =>
  NOTIFICATION_META[type] || NOTIFICATION_META.GRIEVANCE_UPDATED;

/** Inline color for header popover (hex) */
export const getNotificationColor = (type) => {
  const meta = getNotificationMeta(type);
  const map = {
    blue: '#2563eb',
    green: '#10b981',
    red: '#ef4444',
    purple: '#7c3aed',
    orange: '#f59e0b',
  };
  return map[meta.color] || '#2563eb';
};

export const NOTIFICATIONS_ROLE_CONFIG = {
  admin: {
    pageClass: 'admin-overview-page',
    title: 'System Alerts & Notifications',
    subtitle: 'Monitor SLA breaches, new grievances, and system alerts.',
    paginated: true,
    pageSize: 10,
    onNavigate: (n, navigate) => {
      if (n.entity_type === 'Grievance' && n.entity_id) {
        navigate(`/admin/grievances/${n.entity_id}`);
      }
    },
  },
  staff: {
    pageClass: 'student-page',
    title: 'Notifications',
    subtitle: 'Stay updated with the latest activities and updates.',
    paginated: false,
    onNavigate: (n, navigate) => {
      if (n.entity_type === 'Grievance' && n.entity_id) {
        navigate(`/staff/assigned/${n.entity_id}`);
      }
    },
  },
};
