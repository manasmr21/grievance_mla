import React from 'react';
import './GrievanceTable.css';

const GrievanceTable = ({ 
  columns, 
  data, 
  emptyMessage = 'No grievances found.', 
  sortField, 
  sortOrder, 
  onSort,
  isLoading = false 
}) => {
  return (
    <div className={`dashboard-table-wrap ${isLoading ? 'table-loading' : ''}`}>
      {isLoading && data.length > 0 && (
        <div className="table-refresh-indicator" aria-live="polite">
          <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />
          <span>Updating…</span>
        </div>
      )}
      <table className="dashboard-table">
        <thead>
          <tr>
            {columns.map((col) => {
              const isSortable = col.sortable && onSort;
              const isActive = sortField === col.key;
              return (
                <th key={col.key} style={col.style}>
                  {isSortable ? (
                    <button
                      type="button"
                      className={`table-header-sort-btn ${isActive ? 'active' : ''}`}
                      onClick={() => onSort(col.key)}
                    >
                      <span>{col.label}</span>
                      <span className="sort-arrows-icon">
                        {isActive ? (
                          sortOrder === 'ASC' ? (
                            <i className="fa-solid fa-sort-up"></i>
                          ) : (
                            <i className="fa-solid fa-sort-down"></i>
                          )
                        ) : (
                          <i className="fa-solid fa-sort" style={{ opacity: 0.4 }}></i>
                        )}
                      </span>
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {isLoading && data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-loading-cell">
                <div className="table-spinner-wrap">
                  <i className="fa-solid fa-circle-notch fa-spin fa-2x"></i>
                  <span>Loading data...</span>
                </div>
              </td>
            </tr>
          ) : data.length > 0 ? (
            data.map((item, rowIndex) => (
              <tr key={item.id || rowIndex} className={isLoading ? 'table-row-refreshing' : undefined}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={col.className}
                    style={col.style}
                    data-label={col.label}
                  >
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="table-empty">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default GrievanceTable;
