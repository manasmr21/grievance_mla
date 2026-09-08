/** Maps auth role string → menu API role_code */
export const ROLE_CODE_ALIASES = {
  admin: 'ADMIN',
};

export const DEFAULT_MENU_ROLE_CODE = 'ADMIN';

export const ROLE_SUBHEADERS = {
  ADMIN: 'Admin Dashboard',
};

/** Optional subtitles for header pageMeta */
export const PAGE_SUBTITLES = {
  '/admin/dashboard': 'Monitor platform health, usage, and grievance performance.',
  '/admin/users': 'Create and maintain user accounts.',
  '/admin/grievances': 'Review, filter, and manage complaints across the whole system.',
  '/admin/departments': 'Manage departments and assignments.',
  '/admin/roles': 'Define and manage system roles assigned to users.',
  '/admin/menus': 'Configure navigation menus and role-based access.',
  '/admin/categories': 'Maintain complaint categories and sub-categories.',
  '/admin/ticket-management': 'Configure ticket statuses and priorities.',
  '/admin/grievance-paths': 'Configure multi-stage grievance routing paths.',
  '/admin/audit-logs': 'Track and review all actions performed in the system.',
  '/admin/reports': 'Filter grievance reports by department.',
  '/admin/notifications': 'Track system alerts and administrative updates.',
  '/admin/profile': 'Review administrator account details and active sessions.',
  '/staff/dashboard': 'Review assigned grievances and department updates.',
  '/staff/assigned': 'View the grievances assigned to your department.',
  '/staff/notifications': 'Check the latest grievance alerts and updates.',
  '/staff/profile': 'Review your department account details.',
};
