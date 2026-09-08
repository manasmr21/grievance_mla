import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import {
  addNotification,
  addToast,
  removeToast,
  fetchNotificationsThunk,
} from '../store/slices/notificationSlice';

const getTypeConfig = (type) => {
  switch (type) {
    case 'success':
      return {
        borderColor: '#10b981',
        iconColor: '#10b981',
        iconClass: 'fa-solid fa-circle-check',
        defaultTitle: 'Success',
      };
    case 'error':
      return {
        borderColor: '#ef4444',
        iconColor: '#ef4444',
        iconClass: 'fa-solid fa-circle-xmark',
        defaultTitle: 'Error',
      };
    case 'warning':
      return {
        borderColor: '#f59e0b',
        iconColor: '#f59e0b',
        iconClass: 'fa-solid fa-triangle-exclamation',
        defaultTitle: 'Warning',
      };
    case 'info':
    default:
      return {
        borderColor: '#2563eb',
        iconColor: '#2563eb',
        iconClass: 'fa-regular fa-bell',
        defaultTitle: 'Notification',
      };
  }
};

export const NotificationSocketManager = () => {
  const { isAuthenticated } = useAuth();
  const dispatch = useDispatch();
  const toasts = useSelector((state) => state.notifications.toasts);
  const toastTimersRef = useRef(new Map());

  useEffect(() => {
    let socket;
    const toastTimers = toastTimersRef.current;

    const scheduleToastRemoval = (id) => {
      const existing = toastTimers.get(id);
      if (existing != null) window.clearTimeout(existing);
      const timerId = window.setTimeout(() => {
        toastTimers.delete(id);
        dispatch(removeToast(id));
      }, 5000);
      toastTimers.set(id, timerId);
    };

    if (isAuthenticated) {
      dispatch(fetchNotificationsThunk());

      const baseUrl = import.meta.env.VITE_BASE_URL;
      socket = io(`${baseUrl}/notifications`, {
        withCredentials: true,
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        console.log('Notification Redux Socket connected successfully');
      });

      socket.on('newNotification', (notif) => {
        dispatch(addNotification(notif));
        const toastId = Date.now();
        dispatch(addToast({ id: toastId, title: notif.title, message: notif.message }));
        scheduleToastRemoval(toastId);
      });

      socket.on('error', (err) => {
        console.error('Notification Redux Socket error:', err);
      });
    }

    return () => {
      toastTimers.forEach((timerId) => window.clearTimeout(timerId));
      toastTimers.clear();
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
    };
  }, [isAuthenticated, dispatch]);

  return (
    <>
      <div className="toast-container" style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'none' }}>
        {toasts.map((toast) => {
          const config = getTypeConfig(toast.type);
          return (
            <div key={toast.id} className="notification-toast" style={{ background: '#ffffff', borderLeft: `4px solid ${config.borderColor}`, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', padding: '16px 20px', borderRadius: '12px', minWidth: '320px', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '6px', pointerEvents: 'auto', border: '1px solid #e2e8f0', transition: 'all 0.3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                  <i className={config.iconClass} style={{ color: config.iconColor, fontSize: '15px' }} />
                  <strong style={{ fontSize: '13.5px', fontWeight: '700' }}>{toast.title || config.defaultTitle}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const timerId = toastTimersRef.current.get(toast.id);
                    if (timerId != null) {
                      window.clearTimeout(timerId);
                      toastTimersRef.current.delete(toast.id);
                    }
                    dispatch(removeToast(toast.id));
                  }}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px', padding: 0, lineHeight: 1 }}
                >
                  &times;
                </button>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.4, fontWeight: '500' }}>{toast.message}</p>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .notification-toast {
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </>
  );
};

export default NotificationSocketManager;
