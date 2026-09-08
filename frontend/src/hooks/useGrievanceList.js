import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Paginated list fetch with AbortController cleanup.
 */
export function useGrievanceList({ fetchFn, deps = [], enabled = true }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState({});
  const abortRef = useRef(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const result = await fetchFn({ page, limit, signal: controller.signal });
      if (controller.signal.aborted) return;
      setData(result?.data ?? []);
      setTotal(result?.total ?? result?.count ?? 0);
      if (result?.meta) setMeta(result.meta);
    } catch (err) {
      if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return;
      console.error(err);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [enabled, fetchFn, page, limit]);

  useEffect(() => {
    reload();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [reload, ...deps]);

  useEffect(() => () => {
    if (abortRef.current) abortRef.current.abort();
  }, []);

  return {
    page,
    setPage,
    limit,
    setLimit,
    loading,
    data,
    total,
    meta,
    reload,
    totalPages: Math.max(1, Math.ceil(total / limit) || 1),
  };
}

export default useGrievanceList;
