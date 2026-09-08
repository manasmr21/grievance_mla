import { useEffect, useRef } from 'react';

/**
 * Returns a ref that is true while the component is mounted.
 * Check ref.current before calling setState after async work.
 */
export function useIsMounted() {
  const ref = useRef(true);

  useEffect(() => {
    ref.current = true;
    return () => {
      ref.current = false;
    };
  }, []);

  return ref;
}

export default useIsMounted;
