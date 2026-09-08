import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Password reset request with auto-clearing status messages (cleanup on unmount).
 */
export function usePasswordReset(requestFn) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const timersRef = useRef([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const scheduleClear = useCallback((setter, ms = 6000) => {
    const id = window.setTimeout(() => setter(''), ms);
    timersRef.current.push(id);
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const requestReset = useCallback(async (email) => {
    if (!email) return;
    setSending(true);
    setMessage('');
    setError('');
    clearTimers();
    try {
      const res = await requestFn(email);
      if (res?.success) {
        setMessage('A password reset link has been sent to your email.');
        scheduleClear(setMessage);
      } else {
        throw new Error(res?.message || 'Failed to send reset link.');
      }
    } catch (err) {
      setError(err.message || 'Error sending password reset link.');
      scheduleClear(setError);
    } finally {
      setSending(false);
    }
  }, [requestFn, clearTimers, scheduleClear]);

  return { sending, message, error, requestReset, clearStatus: clearTimers };
}

export default usePasswordReset;
