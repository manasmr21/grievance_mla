import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import store from '../store/store';
import { logoutAction } from '../store/slices/authSlice';
import {
  clearAuthStorage,
  getRemainingSessionMs,
  isSessionExpired,
} from '../utils/session';
import { setUnauthorizedHandler } from '../services/api/axios.services';

/**
 * Ends the client session and sends the user to login.
 * Uses logoutAction (no API) so an already-expired cookie cannot block redirect.
 */
export const forceSessionEnd = (navigate, dispatch, { reason } = {}) => {
  if (typeof window === 'undefined') return;
  if (window.__sessionEnding) return;
  window.__sessionEnding = true;

  try {
    dispatch(logoutAction());
    clearAuthStorage();
  } catch (e) {
    console.error('Failed to clear session on timeout:', e);
  }

  const onLoginPage = window.location.pathname.startsWith('/login');
  if (!onLoginPage) {
    if (navigate) {
      navigate('/login', {
        replace: true,
        state: reason ? { sessionExpired: true, reason } : { sessionExpired: true },
      });
    } else {
      window.location.assign('/login');
    }
  }

  // Allow future session ends after navigation settles
  setTimeout(() => {
    window.__sessionEnding = false;
  }, 1500);
};

const SessionWatcher = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const timerRef = useRef(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Global API 401 → login (only when a client session is active)
  useEffect(() => {
    setUnauthorizedHandler(() => {
      // Avoid aborting in-progress login enrichment calls (roles/student details)
      // before auth slice has been marked authenticated.
      if (!store.getState().auth.isAuthenticated) return;
      forceSessionEnd(navigate, dispatch, { reason: 'unauthorized' });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate, dispatch]);

  // Client timer matching cookie / JWT (1h)
  useEffect(() => {
    clearTimer();

    if (!isAuthenticated) {
      return clearTimer;
    }

    if (isSessionExpired()) {
      forceSessionEnd(navigate, dispatch, { reason: 'timeout' });
      return clearTimer;
    }

    const remaining = getRemainingSessionMs();
    if (remaining <= 0) {
      forceSessionEnd(navigate, dispatch, { reason: 'timeout' });
      return clearTimer;
    }

    timerRef.current = setTimeout(() => {
      forceSessionEnd(navigate, dispatch, { reason: 'timeout' });
    }, remaining);

    return clearTimer;
  }, [isAuthenticated, location.pathname, navigate, dispatch]);

  return null;
};

export default SessionWatcher;
