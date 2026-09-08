import React from 'react';

const AdminPageLayout = ({
  pageClass = 'cm-page',
  heroClass = 'cm-hero',
  title,
  subtitle,
  actions,
  children,
  panelClass = 'cm-panel',
}) => (
  <div className={pageClass}>
    <div className={heroClass}>
      <div className="cm-hero-copy">
        <h1 className="cm-title">{title}</h1>
        {subtitle && <p className="cm-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="cm-hero-actions">{actions}</div>}
    </div>
    <section className={panelClass}>{children}</section>
  </div>
);

export default AdminPageLayout;
