import React from 'react';
import './StatCard.css';

const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  tone = 'blue', 
  trend, 
  trendType = 'positive' 
}) => {
  const IconComponent = typeof icon !== 'string' ? icon : null;

  return (
    <article className="dashboard-stat-card">
      <div className={`stat-card-icon tone-${tone}`}>
        {typeof icon === 'string' ? (
          <i className={icon}></i>
        ) : (
          IconComponent && <IconComponent />
        )}
      </div>
      <div className="stat-card-content">
        <div className="stat-card-head">
          <div className="stat-card-main">
            <h3>{title}</h3>
            <strong>{value}</strong>
          </div>
          {trend && (
            <span className={`stat-card-trend ${trendType}`}>
              {trendType === 'positive' ? '↗' : trendType === 'negative' ? '↘' : ''} {trend}
            </span>
          )}
        </div>
        {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}
      </div>
    </article>
  );
};

export default StatCard;
