import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/admin/Dashboard.css';

const RoleQuickLinksDashboard = ({
  pageClass = 'admin-overview-page admin-dashboard-simple',
  title,
  subtitle,
  links = [],
}) => {
  const navigate = useNavigate();

  return (
    <div className={pageClass}>
      <section className="admin-overview-hero admin-dashboard-welcome">
        <div className="admin-overview-copy">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </section>

      <section className="admin-panel admin-actions-panel admin-dashboard-quicklinks">
        <div className="admin-panel-head">
          <h2>Quick Links</h2>
        </div>

        <div className="admin-action-grid">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.label}
                type="button"
                className={`admin-action-card tone-${link.tone}`}
                onClick={() => navigate(link.path)}
              >
                <div className="admin-action-icon">
                  <Icon />
                </div>
                <span>{link.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default RoleQuickLinksDashboard;
