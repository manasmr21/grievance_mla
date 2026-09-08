import React from 'react';
import PaginationPageNumbers from './PaginationPageNumbers';

/**
 * Standard pagination footer: result range + page controls.
 */
const PaginationFooter = ({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 25, 50],
  className = 'cm-pagination',
  infoClassName = 'cm-page-info',
  controlsClassName = 'cm-page-controls',
  buttonClassName = 'cm-page-btn',
  itemLabel = 'items',
}) => {
  if (totalPages <= 1 && !onLimitChange) return null;

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className={className}>
      <div className={infoClassName}>
        Showing {start} to {end} of {total} {itemLabel}
      </div>
      <div className={controlsClassName}>
        {onLimitChange && (
          <select value={limit} onChange={(e) => onLimitChange(Number(e.target.value))} aria-label="Rows per page">
            {limitOptions.map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        )}
        <button type="button" className={buttonClassName} onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} aria-label="Previous page">
          <i className="fa-solid fa-chevron-left" />
        </button>
        <PaginationPageNumbers page={page} totalPages={totalPages} onPageChange={onPageChange} buttonClassName={buttonClassName} />
        <button type="button" className={buttonClassName} onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} aria-label="Next page">
          <i className="fa-solid fa-chevron-right" />
        </button>
      </div>
    </div>
  );
};

export default PaginationFooter;
