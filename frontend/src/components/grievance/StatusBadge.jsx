import React from 'react';
import { getCategoryIconClass } from '../../utils/grievanceBadges';

const StatusBadge = ({ status, color, className = 'ng-status' }) => (
  <span className={`${className} ${className}-${color}`}>{status}</span>
);

export default StatusBadge;

export const CategoryIcon = ({ category, className }) => (
  <i className={className || getCategoryIconClass(category)} aria-hidden="true" />
);

export { getCategoryIconClass };
