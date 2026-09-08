import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import './Toast.css';

const ToastContext = createContext(null);

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const clearTimer = useCallback((id) => {
    const timerId = timersRef.current.get(id);
    if (timerId != null) {
      window.clearTimeout(timerId);
      timersRef.current.delete(id);
    }
  }, []);

  const dismiss = useCallback((id) => {
    clearTimer(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, [clearTimer]);

  const showToast = useCallback((message, variant = 'info', durationMs = 4000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, variant }]);
    if (durationMs > 0) {
      const timerId = window.setTimeout(() => dismiss(id), durationMs);
      timersRef.current.set(id, timerId);
    }
    return id;
  }, [dismiss]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
      timers.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      showToast,
      showSuccess: (message, durationMs) => showToast(message, 'success', durationMs),
      showError: (message, durationMs) => showToast(message, 'error', durationMs),
      showInfo: (message, durationMs) => showToast(message, 'info', durationMs),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.variant}`}>
            <span>{toast.message}</span>
            <button type="button" className="toast-close" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
};

export default ToastProvider;
