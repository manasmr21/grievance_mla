import React from 'react';

/**
 * Reusable filter toolbar for grievance list pages.
 */
const GrievanceListToolbar = ({
  search,
  onSearchChange,
  searchPlaceholder = 'Search grievances...',
  filters = [],
  onClear,
  className = 'mg-filter-grid',
}) => (
  <div className={className}>
    {search != null && (
      <label className="mg-filter mg-filter-search">
        <span>Search</span>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
        />
      </label>
    )}
    {filters.map((filter) => (
      <label key={filter.key || filter.label} className="mg-filter">
        <span>{filter.label}</span>
        <select value={filter.value} onChange={(e) => filter.onChange?.(e.target.value)}>
          {filter.options.map((opt) => (
            <option key={opt.value ?? opt} value={opt.value ?? opt}>
              {opt.label ?? opt}
            </option>
          ))}
        </select>
      </label>
    ))}
    {onClear && (
      <button type="button" className="mg-clear-btn" onClick={onClear}>
        Clear filters
      </button>
    )}
  </div>
);

export default GrievanceListToolbar;
