import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { useNavigation } from '../../hooks/useNavigation';
import NotificationList from '../notifications/NotificationList';
import './header.css';

const ROLE_ICONS = {
  ADMIN: 'fa-solid fa-shield-halved',
  STUDENT: 'fa-solid fa-graduation-cap',
  HOD: 'fa-solid fa-chalkboard-user',
  WARDEN: 'fa-solid fa-house-lock',
  SUPERINTENDENT: 'fa-solid fa-building-user',
  ASSISTANT_SUPERINTENDENT: 'fa-solid fa-user-tie',
  COORDINATOR: 'fa-solid fa-diagram-project',
  ELECTRICIAN: 'fa-solid fa-bolt',
  PLUMBER: 'fa-solid fa-wrench',
  CLEANER: 'fa-solid fa-broom',
  CARETAKER: 'fa-solid fa-hand-holding-heart',
  CHAIRPERSON_PGC: 'fa-solid fa-gavel',
  REGISTRAR: 'fa-solid fa-file-signature',
};

const getRoleIcon = (code) => {
  const upperCode = (code || '').toUpperCase();
  return ROLE_ICONS[upperCode] || 'fa-solid fa-user-gear';
};

const DASHBOARD_DATE_STORAGE_KEY = 'grievance-portal-selected-date';

const formatDisplayDate = (value) => {
  if (!value) {
    return 'Select date';
  }

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? 'Select date'
    : date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
};

const formatRelativeTime = (dateStr) => {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    if (diffMs < 0) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recently';
  }
};

const getNotificationColor = (type) => {
  switch (type) {
    case 'STUDENT_REGISTERED': return '#3b82f6'; // blue
    case 'GRIEVANCE_CREATED': return '#10b981'; // green
    case 'GRIEVANCE_ASSIGNED': return '#8b5cf6'; // purple
    case 'GRIEVANCE_REOPENED': return '#ef4444'; // red
    default: return '#64748b'; // slate
  }
};

const getDashboardTitle = (roleString) => {
  if (!roleString) return 'User';
  const roleLower = roleString.toLowerCase();
  if (roleLower === 'hod') return 'HOD';
  if (roleLower === 'admin') return 'Admin';
  return roleString.charAt(0).toUpperCase() + roleString.slice(1).toLowerCase();
};

const Header = ({ toggleSidebar, isMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, activeRole, activeDepartment, setActiveDepartment, logout, getDefaultRouteForRole, getDepartmentsForActiveRole, showDepartmentSwitcher } = useAuth();
  const { notifications, unreadCount, markAllRead, markAsRead } = useNotifications();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isDeptSwitcherOpen, setIsDeptSwitcherOpen] = useState(false);
  const deptSwitcherRef = useRef(null);
  const departmentsForActiveRole = getDepartmentsForActiveRole();

  const { getPageLabel } = useNavigation();
  const isStaffArea = location.pathname.startsWith('/staff') || location.pathname.startsWith('/hod');
  const isAdminArea = location.pathname.startsWith('/admin');

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    setIsNotificationsOpen(false);

    if (notif.entity_type === 'Grievance' && notif.entity_id) {
      if (isAdminArea) {
        navigate(`/admin/grievances/${notif.entity_id}`);
      } else if (isStaffArea) {
        navigate(`/staff/assigned/${notif.entity_id}`);
      }
    }
  };
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    if (typeof window === 'undefined') {
      return '2025-05-20';
    }

    return window.localStorage.getItem(DASHBOARD_DATE_STORAGE_KEY) || '2025-05-20';
  });
  const calendarRef = useRef(null);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);
  const notificationRoute = isAdminArea
    ? '/admin/notifications'
    : '/staff/notifications';
  const profileRoute = isAdminArea
    ? '/admin/profile'
    : '/staff/profile';
  const settingsRoute = isAdminArea ? '/admin/settings' : profileRoute;
  const pageFromNav = getPageLabel(location.pathname);
  const currentPage = pageFromNav || {
    title: 'Dashboard',
    subtitle: '',
  };
  const firstName = user?.name?.split(' ')[0] || (isAdminArea ? 'Admin' : 'Staff');
  const avatarLetter = user?.name?.charAt(0)?.toUpperCase() || (isAdminArea ? 'A' : 'S');
  const displayDate = useMemo(() => formatDisplayDate(selectedDate), [selectedDate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsCalendarOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (deptSwitcherRef.current && !deptSwitcherRef.current.contains(event.target)) {
        setIsDeptSwitcherOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsCalendarOpen(false);
    setIsProfileOpen(false);
    setIsNotificationsOpen(false);
    setIsDeptSwitcherOpen(false);
  }, [location.pathname]);

  const handleDepartmentSwitch = (dept) => {
    setIsDeptSwitcherOpen(false);
    setActiveDepartment(dept);
  };

  const applySelectedDate = (value) => {
    setSelectedDate(value);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DASHBOARD_DATE_STORAGE_KEY, value);
      window.dispatchEvent(
        new CustomEvent('grievance-dashboard-date-change', {
          detail: { value },
        }),
      );
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <i className="fa-solid fa-bars"></i>
        </button>


      </div>

      <div className="header-right">


        <div className="header-actions">

          <div className="header-popover-wrap" ref={notificationRef}>
            <button
              className={`icon-btn notification-btn ${isNotificationsOpen ? 'active' : ''}`}
              onClick={() => setIsNotificationsOpen((current) => !current)}
              aria-label="Open notifications"
              title="Notifications"
            >
              <i className="fa-regular fa-bell"></i>
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>

            {isNotificationsOpen && (
              <div className="header-popover notification-popover" style={{ width: '300px', padding: '12px' }}>
                <div className="popover-head" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #eef2f7', marginBottom: '2px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Notifications</strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{unreadCount} unread alerts</span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <NotificationList
                  notifications={notifications.slice(0, 5)}
                  onItemClick={handleNotificationClick}
                  compact
                  emptyMessage="No notifications yet"
                />

                <div style={{ paddingTop: '10px', borderTop: '1px solid #eef2f7', textAlign: 'center', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      navigate(notificationRoute);
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '6px 0' }}
                  >
                    View All Notifications <i className="fa-solid fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            )}
          </div>

          {showDepartmentSwitcher && (
            <div className="header-popover-wrap" ref={deptSwitcherRef}>
              <button
                type="button"
                className={`role-switcher-btn dept-switcher-btn ${isDeptSwitcherOpen ? 'active' : ''}`}
                onClick={() => setIsDeptSwitcherOpen((current) => !current)}
                aria-label="Switch department"
                title={`Switch department (${activeDepartment?.name || 'Department'})`}
              >
                <i className="fa-solid fa-building-columns" aria-hidden="true" />
                <span className="role-switcher-label">
                  {activeDepartment?.name || 'Department'}
                </span>
                <i className="fa-solid fa-chevron-down role-switcher-chevron" aria-hidden="true" />
              </button>

              {isDeptSwitcherOpen && (
                <div className="header-popover role-switcher-popover dept-switcher-popover">
                  <div className="role-switcher-popover-title">
                    Switch Department
                  </div>
                  {departmentsForActiveRole.map((dept) => {
                    const isActive = activeDepartment && Number(dept.id) === Number(activeDepartment.id);
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        className={`role-switcher-option ${isActive ? 'active' : ''}`}
                        onClick={() => handleDepartmentSwitch(dept)}
                      >
                        <i className="fa-solid fa-building-columns" aria-hidden="true" />
                        <span>{dept.name}</span>
                        {isActive && (
                          <i className="fa-solid fa-check" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        <div className="header-popover-wrap" ref={profileRef}>
          <button
            className={`user-profile ${isProfileOpen ? 'active' : ''}`}
            onClick={() => setIsProfileOpen((current) => !current)}
            aria-label="Open profile menu"
          >
            <div className="avatar">{avatarLetter}</div>
          </button>

          {isProfileOpen && (
            <div className="header-popover profile-popover">
              <div className="popover-head">
                <strong>{user?.name || 'User'}</strong>
                <span>{role?.toUpperCase() || 'ACCOUNT'}</span>
              </div>
              <div className="profile-popover-actions">
                <button type="button" onClick={() => navigate(profileRoute)}>
                  <i className="fa-regular fa-user"></i>
                  <span>View Profile</span>
                </button>

                <button type="button" className="danger" onClick={handleLogout}>
                  <i className="fa-solid fa-arrow-right-from-bracket"></i>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
