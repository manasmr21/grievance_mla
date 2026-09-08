import React, { useState, useEffect } from 'react';
import useDebounce from '../../hooks/useDebounce';

const DEBOUNCE_MS = 500;

/**
 * Search input that debounces user input (500ms) and supports aborting in-flight
 * API requests via the onTyping callback. Styled with the shared cm-search-box class.
 *
 * Props:
 *   placeholder  – input placeholder text
 *   onDebouncedChange(value) – called after 500ms of silence; parent fires the API
 *   onTyping()   – called on every keystroke; parent can abort in-flight requests
 *   className    – wrapper class (defaults to cm-search-box)
 */
const DebouncedSearchInput = ({
  placeholder = 'Search...',
  onDebouncedChange,
  onTyping,
  className = 'cm-search-box',
}) => {
  const [value, setValue] = useState('');
  const debouncedValue = useDebounce(value, DEBOUNCE_MS);

  const handleChange = (e) => {
    const next = e.target.value;
    setValue(next);
    if (onTyping) onTyping();
  };

  const handleClear = () => {
    setValue('');
    if (onTyping) onTyping();
  };

  useEffect(() => {
    if (onDebouncedChange) onDebouncedChange(debouncedValue);
  }, [debouncedValue]);

  return (
    <div className={className}>
      <i className="fa-solid fa-magnifying-glass" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
      />
      {value && (
        <button
          type="button"
          className="cm-search-clear"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <i className="fa-solid fa-xmark" />
        </button>
      )}
    </div>
  );
};

export default DebouncedSearchInput;
