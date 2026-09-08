import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import GrievancePaths from '../admin/GrievancePaths.jsx';
import CategoryManager from '../admin/CategoryManager.jsx';
import AdminDashboard from '../admin/Dashboard.jsx';
import GrievanceDetail from '../staff/GrievanceDetail.jsx';
import ManageGrievances from '../admin/ManageGrievances.jsx';
import ManageUsers from '../admin/ManageUsers.jsx';
import NotificationsPage from '../components/notifications/NotificationsPage';
import AdminProfile from '../admin/Profile.jsx';
import AuditLogs from '../admin/auditlogs.jsx';
import AdminReports from '../admin/Reports.jsx';
import DepartmentManager from '../admin/DepartmentManager.jsx';
import RoleManager from '../admin/RoleManager.jsx';
import MenuManager from '../admin/MenuManager.jsx';
import TicketManager from '../admin/TicketManager.jsx';
import ProtectedRoute from '../components/ProtectedRoute.jsx';
import MainLayout from '../components/layouts/mainlayout';
import { useAuth } from '../hooks/useAuth';
import StaffDashboard from '../staff/Dashboard.jsx';
import MyAssigned from '../staff/MyAssigned.jsx';
import MyProfile from '../staff/MyProfile.jsx';
import StaffNotifications from '../components/notifications/NotificationsPage';
import Login from '../pages/auth/Login.jsx';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage.jsx';
import Unauthorized from '../pages/Unauthorized.jsx';
import PublicGrievanceForm from '../pages/public/PublicGrievanceForm.jsx';
import TrackGrievance from '../pages/public/TrackGrievance.jsx';

const HodRedirect = () => {
  const location = useLocation();
  const suffix = location.pathname.replace(/^\/hod/, '') || '/dashboard';
  return <Navigate to={`/staff${suffix}${location.search}${location.hash}`} replace />;
};

const RootRedirect = () => {
  const { isAuthenticated, role, getDefaultRouteForRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDefaultRouteForRole(role)} replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/submit-grievance" element={<PublicGrievanceForm />} />
      <Route path="/track-grievance" element={<TrackGrievance />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Legacy HOD URLs → staff */}
      <Route path="/hod" element={<Navigate to="/staff/dashboard" replace />} />
      <Route path="/hod/*" element={<HodRedirect />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
            <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />
            <Route path="/staff/dashboard" element={<StaffDashboard />} />
            <Route path="/staff/assigned" element={<MyAssigned />} />
            <Route path="/staff/notifications" element={<StaffNotifications role="staff" />} />
            <Route path="/staff/profile" element={<MyProfile />} />
            <Route path="/staff/assigned/:id" element={<GrievanceDetail />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<ManageUsers />} />
            <Route path="/admin/grievances" element={<ManageGrievances />} />
            <Route path="/admin/categories" element={<CategoryManager />} />
            <Route path="/admin/ticket-management" element={<TicketManager />} />
            <Route path="/admin/grievance-paths" element={<GrievancePaths />} />
            <Route path="/admin/notifications" element={<NotificationsPage role="admin" />} />
            <Route path="/admin/audit-logs" element={<AuditLogs />} />
            <Route path="/admin/grievances/:id" element={<GrievanceDetail backPath="/admin/grievances" backLabel="Back to All Grievances" />} />
            <Route path="/admin/departments" element={<DepartmentManager />} />
            <Route path="/admin/roles" element={<RoleManager />} />
            <Route path="/admin/menus" element={<MenuManager />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            {/* Legacy admin URL */}
            <Route path="/admin/assignment-rules" element={<Navigate to="/admin/grievance-paths" replace />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
