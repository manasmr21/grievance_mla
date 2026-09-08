import { useEffect } from 'react';

/**
 * Runs an async function inside useEffect with automatic cancellation on
 * unmount or dependency change.
 *
 * @param {(ctx: { signal: AbortSignal, cancelled: () => boolean }) => Promise<void>|void} asyncFn
 * @param {React.DependencyList} deps
 */
export function useAsyncEffect(asyncFn, deps) {
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const isCancelled = () => cancelled;

    (async () => {
      try {
        await asyncFn({ signal: controller.signal, cancelled: isCancelled });
      } catch (err) {
        if (!cancelled && err?.name !== 'AbortError' && err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
          console.error(err);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default useAsyncEffect;
