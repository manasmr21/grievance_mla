import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const PANEL_MAX_HEIGHT = 280;
const PANEL_MIN_SPACE = 160;

const defaultFilter = (query, option, getOptionLabel) => {
  const label = String(getOptionLabel(option) || '').toLowerCase();
  return label.includes(String(query || '').trim().toLowerCase());
};

const SearchableSelect = ({
  id,
  options = [],
  value = '',
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  disabled = false,
  allowClear = false,
  clearLabel = 'Clear selection',
  emptyMessage = 'No matches found',
  getOptionLabel = (option) => String(option?.label ?? option?.name ?? ''),
  getOptionValue = (option) => String(option?.value ?? option?.id ?? ''),
  filterFn,
  renderOption,
  className = '',
}) => {
  const autoId = useId();
  const inputId = id || autoId;
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [panelStyle, setPanelStyle] = useState(null);

  const selectedOption = useMemo(
    () => options.find((option) => getOptionValue(option) === String(value)),
    [options, value, getOptionValue],
  );

  const filteredOptions = useMemo(() => {
    const matcher = filterFn || ((q, option) => defaultFilter(q, option, getOptionLabel));
    if (!query.trim()) return options;
    return options.filter((option) => matcher(query, option));
  }, [options, query, filterFn, getOptionLabel]);

  const updatePanelPosition = useCallback(() => {
    if (!rootRef.current) return;

    const rect = rootRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < PANEL_MIN_SPACE && spaceAbove > spaceBelow;

    setPanelStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      maxHeight: PANEL_MAX_HEIGHT,
      zIndex: 1000,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setPanelStyle(null);
      return undefined;
    }

    updatePanelPosition();
    window.addEventListener('scroll', updatePanelPosition, true);
    window.addEventListener('resize', updatePanelPosition);

    return () => {
      window.removeEventListener('scroll', updatePanelPosition, true);
      window.removeEventListener('resize', updatePanelPosition);
    };
  }, [isOpen, updatePanelPosition]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      const target = event.target;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const handleSelect = (option) => {
    onChange(getOptionValue(option));
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = (event) => {
    event.stopPropagation();
    onChange('');
    setQuery('');
    setIsOpen(false);
  };

  const panel = isOpen && panelStyle ? (
    <div
      ref={panelRef}
      className="searchable-select-panel searchable-select-panel--portal"
      style={panelStyle}
    >
      <div className="searchable-select-search">
        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
        <input
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          autoComplete="off"
        />
      </div>
      <ul id={`${inputId}-listbox`} className="searchable-select-list" role="listbox">
        {filteredOptions.length === 0 ? (
          <li className="searchable-select-empty">{emptyMessage}</li>
        ) : (
          filteredOptions.map((option) => {
            const optionValue = getOptionValue(option);
            const isSelected = String(value) === optionValue;
            return (
              <li key={optionValue}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`searchable-select-option${isSelected ? ' is-selected' : ''}`}
                  onClick={() => handleSelect(option)}
                >
                  {renderOption ? renderOption(option, isSelected) : getOptionLabel(option)}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  ) : null;

  return (
    <>
      <div
        ref={rootRef}
        className={`searchable-select${isOpen ? ' is-open' : ''}${disabled ? ' is-disabled' : ''} ${className}`.trim()}
      >
        <button
          type="button"
          className="searchable-select-trigger"
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={`${inputId}-listbox`}
        >
          <span className={selectedOption ? 'searchable-select-value' : 'searchable-select-placeholder'}>
            {selectedOption ? getOptionLabel(selectedOption) : placeholder}
          </span>
          <span className="searchable-select-icons">
            {allowClear && value && (
              <span
                role="button"
                tabIndex={0}
                className="searchable-select-clear"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleClear(e);
                }}
                aria-label={clearLabel}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </span>
            )}
            <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} aria-hidden="true" />
          </span>
        </button>
      </div>
      {panel && createPortal(panel, document.body)}
    </>
  );
};

export default SearchableSelect;
