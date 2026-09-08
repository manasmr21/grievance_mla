import {
  FiBell,
  FiClipboard,
  FiClock,
  FiFileText,
  FiFolderPlus,
  FiHelpCircle,
  FiPlusCircle,
  FiSettings,
  FiShield,
  FiUser,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi';

export const ADMIN_DASHBOARD_LINKS = [
  { label: 'Manage Grievances', icon: FiFileText, tone: 'blue', path: '/admin/grievances' },
  { label: 'Department Manager', icon: FiUsers, tone: 'cyan', path: '/admin/departments' },
  { label: 'Role Manager', icon: FiShield, tone: 'purple', path: '/admin/roles' },
  { label: 'Category Manager', icon: FiFolderPlus, tone: 'green', path: '/admin/categories' },
  { label: 'Ticket Management', icon: FiClock, tone: 'amber', path: '/admin/ticket-management' },
  { label: 'Manage Users', icon: FiUserPlus, tone: 'blue', path: '/admin/users' },
  { label: 'Grievance Paths', icon: FiSettings, tone: 'purple', path: '/admin/grievance-paths' },
  { label: 'Audit Logs', icon: FiPlusCircle, tone: 'cyan', path: '/admin/audit-logs' },
];

export const STAFF_BASE_LINKS = [
  { label: 'My Assigned', icon: FiClipboard, tone: 'blue', path: '/staff/assigned' },
  { label: 'Notifications', icon: FiBell, tone: 'amber', path: '/staff/notifications' },
  { label: 'My Profile', icon: FiUser, tone: 'purple', path: '/staff/profile' },
];

export const getStaffDashboardLinks = () => [...STAFF_BASE_LINKS];

export const DASHBOARD_CONFIG = {
  admin: {
    pageClass: 'admin-overview-page admin-dashboard-simple',
    title: 'Welcome to Dashboard',
    subtitle: 'Use the quick links below to manage the grievance portal.',
    links: ADMIN_DASHBOARD_LINKS,
  },
  staff: {
    pageClass: 'admin-overview-page admin-dashboard-simple',
    title: 'Welcome to Dashboard',
    subtitle: 'Use the quick links below to manage your assigned grievances.',
    getLinks: getStaffDashboardLinks,
  },
};
