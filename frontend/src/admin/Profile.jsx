import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { userApi } from '../services/api/api';
import useAsyncEffect from '../hooks/useAsyncEffect';
import usePasswordReset from '../hooks/usePasswordReset';
import { ProfileLoadingState, ProfileErrorState } from '../components/profile/ProfilePageLayout';
import PasswordResetSection from '../components/profile/PasswordResetSection';
import { getInitials } from '../utils/formatters';
import '../styles/admin/Dashboard.css';
import '../styles/Profile.css';

const AdminProfile = () => {
  const { user, logout } = useAuth();
  const [adminInfo, setAdminInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const profileEmail = adminInfo?.email || user?.email || '';
  const { sending: resetSending, message: resetMessage, error: resetError, requestReset } = usePasswordReset(
    (email) => userApi.forgotPassword(email),
  );

  useAsyncEffect(async ({ cancelled }) => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await userApi.getUserById(user.id);
      if (cancelled()) return;
      if (res?.success && res.data) {
        setAdminInfo(res.data);
      } else {
        throw new Error(res?.message || 'Failed to fetch administrator profile.');
      }
    } catch (err) {
      if (!cancelled()) setError(err.message || 'Failed to load administrator profile.');
    } finally {
      if (!cancelled()) setLoading(false);
    }
  }, [user?.id]);

  const handleLogout = () => logout();

  const handleRequestPasswordReset = () => {
    if (profileEmail) requestReset(profileEmail);
  };

  if (loading) return <ProfileLoadingState message="Loading administrator profile..." />;

  if (error || !adminInfo) {
    return <ProfileErrorState error={error || 'Unable to retrieve administrator profile.'} onRetry={() => window.location.reload()} />;
  }

  // Construct dynamic personal info list showing only details received in the API response
  const personalInfo = [];
  if (adminInfo.name) {
    personalInfo.push({ label: 'Full Name', value: adminInfo.name });
  }
  if (adminInfo.email) {
    personalInfo.push({ label: 'Email Address', value: adminInfo.email });
  }
  if (adminInfo.account_status) {
    personalInfo.push({ label: 'Account Status', value: adminInfo.account_status.charAt(0).toUpperCase() + adminInfo.account_status.slice(1) });
  }
  if (adminInfo.dashboard_route) {
    personalInfo.push({ label: 'Dashboard Route', value: adminInfo.dashboard_route });
  }
  if (adminInfo.createdAt) {
    personalInfo.push({
      label: 'Created At',
      value: new Date(adminInfo.createdAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    });
  }
  if (adminInfo.updatedAt) {
    personalInfo.push({
      label: 'Last Updated',
      value: new Date(adminInfo.updatedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    });
  }

  const sessions = [
    {
      id: 1,
      device: 'Windows 11 • Chrome • Secure Office Network',
    },
  ];

  const avatarInitial = getInitials(adminInfo.name);

  return (
    <div className="admin-dashboard profile-page">
      <header className="profile-header">
        <h1>Admin Profile</h1>
        <p>Manage your administrator profile, security preferences, and active sessions.</p>
      </header>

      <section className="profile-hero-card dashboard-card">
        <div className="profile-hero-content">
          <div className="profile-avatar-wrapper">
            <div className="profile-hero-avatar">{avatarInitial}</div>
            {/* <button className="avatar-edit-btn">
              <i className="fa-solid fa-camera"></i>
            </button> */}
          </div>

          <div className="profile-hero-info">
            <div className="name-row">
              <h2>{adminInfo.name}</h2>
              <span className="role-badge">Admin</span>
            </div>
            <p className="dept-text">System Administrator</p>
            <p className="univ-text">{adminInfo.email}</p>

            <div className="contact-row">
              <span>
                <i className="fa-regular fa-envelope"></i>
                {adminInfo.email}
              </span>
            </div>
          </div>
        </div>

        {/* <button className="edit-profile-btn">
          <i className="fa-solid fa-pen"></i>
          Edit Profile
        </button> */}
      </section>

      <div className="profile-main-grid">
        <section className="dashboard-card personal-info-card">
          <div className="card-head">
            <h3>Personal Information</h3>
          </div>
          <div className="info-list">
            {personalInfo.map((info) => (
              <div key={info.label} className="info-item">
                <span className="info-label">{info.label}</span>
                <span className="info-value">{info.value}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="profile-side-col">
          <PasswordResetSection
            email={profileEmail}
            sending={resetSending}
            message={resetMessage}
            error={resetError}
            onRequestReset={handleRequestPasswordReset}
          />

          <section className="dashboard-card sessions-card">
            <div className="card-head">
              <h3>Connected Sessions</h3>
            </div>
            <div className="sessions-list">
              {sessions.map((session) => (
                <div key={session.id} className="session-item">
                  <div className="session-icon">
                    <i className="fa-solid fa-laptop"></i>
                  </div>
                  <div className="session-info">
                    <div className="session-head">
                      <strong>Current Session</strong>
                      <span className="active-badge">Active</span>
                    </div>
                    <p>{session.device}</p>
                  </div>
                </div>
              ))}
              <button className="logout-all-btn" onClick={handleLogout}>
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
                Log out from all devices
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
