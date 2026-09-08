import { useState, useEffect, useRef, useCallback } from 'react';
import useDebounce from './useDebounce';

const DEBOUNCE_MS = 500;

/**
 * Combines 500ms debounce + AbortController-based in-flight cancellation.
 *
 * Usage:
 *   const { search, handleSearchChange, abortSearch } = useDebouncedSearchFetch({
 *     onDebouncedSearch: (debouncedValue, signal) => fetchData({ search: debouncedValue, signal }),
 *     onPageReset: () => setPage(1),
 *   });
 *
 * Wire handleSearchChange + abortSearch into DebouncedSearchInput:
 *   <DebouncedSearchInput
 *     placeholder="..."
 *     onDebouncedChange={handleSearchChange}
 *     onTyping={abortSearch}
 *   />
 *
 * The fetch is driven externally (caller's useEffect) so the hook doesn't need to
 * know the full dep list. The hook only provides the debounced value and the abort
 * control so pages can integrate it naturally.
 */
const useDebouncedSearchFetch = ({ onPageReset } = {}) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, DEBOUNCE_MS);
  const abortRef = useRef(null);

  // Abort any in-flight request immediately (called on every keystroke)
  const abortSearch = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  // Called when debounced value settles — user stopped typing
  const handleSearchChange = useCallback((value) => {
    setSearch(value);
  }, []);

  // When the debounced value changes, reset pagination
  useEffect(() => {
    if (onPageReset) onPageReset();
  }, [debouncedSearch]);

  // Create a fresh AbortController for each fetch cycle. Returns { signal, abort }.
  const createFetchController = useCallback(() => {
    abortRef.current = new AbortController();
    return abortRef.current;
  }, []);

  // Cleanup on unmount — abort any pending request
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return {
    search,
    debouncedSearch,
    handleSearchChange,
    abortSearch,
    createFetchController,
  };
};

/**
 * Returns true if an error is a cancelled Axios request — callers should
 * ignore these and not update UI state.
 */
export const isAbortError = (err) =>
  err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError' || err?.name === 'AbortError';

export default useDebouncedSearchFetch;
