import React, { useId, useState } from 'react';
import { clampPage, getPaginationItems } from '../../utils/pagination';
import './PaginationPageNumbers.css';

const PaginationPageNumbers = ({
  page,
  totalPages,
  onPageChange,
  buttonClassName,
  activeClassName = 'active',
  showJumpInput = true,
}) => {
  const jumpInputId = useId();
  const [jumpValue, setJumpValue] = useState('');
  const items = getPaginationItems(page, totalPages);

  const handleJumpSubmit = (event) => {
    event.preventDefault();
    const parsed = Number.parseInt(jumpValue, 10);
    if (Number.isNaN(parsed)) return;

    const target = clampPage(parsed, totalPages);
    onPageChange(target);
    setJumpValue('');
  };

  return (
    <>
      {items.map((item, index) => {
        if (item === '...') {
          return (
            <span key={`ellipsis-${index}`} className="pagination-page-ellipsis" aria-hidden="true">
              …
            </span>
          );
        }

        const isActive = page === item;

        return (
          <button
            key={item}
            type="button"
            className={`${buttonClassName}${isActive ? ` ${activeClassName}` : ''}`}
            onClick={() => onPageChange(item)}
            aria-current={isActive ? 'page' : undefined}
          >
            {item}
          </button>
        );
      })}

      {showJumpInput && totalPages > 1 && (
        <form className="pagination-jump-form" onSubmit={handleJumpSubmit}>
          <label className="pagination-jump-label" htmlFor={jumpInputId}>
            Go to
          </label>
          <input
            id={jumpInputId}
            type="number"
            min={1}
            max={totalPages}
            value={jumpValue}
            onChange={(event) => setJumpValue(event.target.value)}
            className="pagination-jump-input"
            placeholder={String(page)}
            aria-label={`Jump to page, 1 to ${totalPages}`}
          />
          <button type="submit" className="pagination-jump-btn">
            Go
          </button>
        </form>
      )}
    </>
  );
};

export default PaginationPageNumbers;
