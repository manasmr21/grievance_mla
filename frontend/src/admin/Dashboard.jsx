import React, { useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import RoleQuickLinksDashboard from '../components/dashboard/RoleQuickLinksDashboard';
import { DASHBOARD_CONFIG } from '../utils/dashboardLinks';

const AdminDashboard = () => {
  const config = DASHBOARD_CONFIG.admin;
  return (
    <RoleQuickLinksDashboard
      pageClass={config.pageClass}
      title={config.title}
      subtitle={config.subtitle}
      links={config.links}
    />
  );
};

export default AdminDashboard;
