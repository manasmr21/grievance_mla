import React, { useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import RoleQuickLinksDashboard from '../components/dashboard/RoleQuickLinksDashboard';
import { DASHBOARD_CONFIG } from '../utils/dashboardLinks';
import '../styles/staff/CommonStaff.css';

const StaffDashboard = () => {
  const { role } = useAuth();
  const config = DASHBOARD_CONFIG.staff;
  const links = useMemo(() => config.getLinks(role), [role]);

  return (
    <RoleQuickLinksDashboard
      pageClass={config.pageClass}
      title={config.title}
      subtitle={config.subtitle}
      links={links}
    />
  );
};

export default StaffDashboard;
