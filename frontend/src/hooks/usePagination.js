import { useCallback, useState } from 'react';

export function usePagination(initialPage = 1, initialLimit = 10) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);

  const resetPage = useCallback(() => setPage(1), []);

  return {
    page,
    setPage,
    limit,
    setLimit,
    total,
    setTotal,
    resetPage,
    totalPages: Math.max(1, Math.ceil(total / limit) || 1),
  };
}

export default usePagination;
