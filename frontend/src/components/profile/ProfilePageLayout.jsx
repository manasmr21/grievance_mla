import React from 'react';

export const ProfileLoadingState = ({ message = 'Loading profile...' }) => (
  <div className="profile-page loading-state" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <div style={{ textAlign: 'center', color: '#64748b' }}>
      <i className="fa-solid fa-spinner fa-spin fa-3x" style={{ color: '#2563eb', marginBottom: '16px' }} />
      <p style={{ marginTop: '12px', fontSize: '1.1rem', fontWeight: '500' }}>{message}</p>
    </div>
  </div>
);

export const ProfileErrorState = ({ error, onRetry }) => (
  <div className="profile-page error-state" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <div style={{ textAlign: 'center', color: '#ef4444', maxWidth: '400px', padding: '24px' }}>
      <i className="fa-solid fa-triangle-exclamation fa-3x" style={{ marginBottom: '16px' }} />
      <p style={{ marginTop: '12px', fontSize: '1.1rem', fontWeight: '500' }}>{error}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="outline-btn" style={{ marginTop: '16px', borderColor: '#ef4444', color: '#ef4444' }}>
          <i className="fa-solid fa-arrows-rotate" style={{ marginRight: '8px' }} /> Retry
        </button>
      )}
    </div>
  </div>
);

const ProfilePageLayout = ({
  pageClass = 'profile-page',
  heroTitle,
  heroSubtitle,
  avatarInitials,
  children,
  onLogout,
  logoutLabel = 'Logout',
}) => (
  <div className={pageClass}>
    <section className="profile-hero-card dashboard-card">
      <div className="profile-hero-content">
        {avatarInitials && <div className="profile-avatar-large">{avatarInitials}</div>}
        <div>
          <h1>{heroTitle}</h1>
          {heroSubtitle && <p>{heroSubtitle}</p>}
        </div>
      </div>
      {onLogout && (
        <button type="button" className="logout-profile-btn" onClick={onLogout}>
          <i className="fa-solid fa-right-from-bracket" /> {logoutLabel}
        </button>
      )}
    </section>
    {children}
  </div>
);

export default ProfilePageLayout;
