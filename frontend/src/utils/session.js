/** Must match backend auth cookie maxAge (1 hour). */
export const SESSION_DURATION_MS = 60 * 60 * 1000;

export const AUTH_STORAGE_KEY = 'grievance-portal-auth';

export const getSessionExpiresAt = () => {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const expiresAt = Number(parsed?.expiresAt);
    return Number.isFinite(expiresAt) ? expiresAt : null;
  } catch {
    return null;
  }
};

export const isSessionExpired = () => {
  const expiresAt = getSessionExpiresAt();
  // No expiry recorded (legacy / cleared) while auth UI thinks logged in → treat as expired
  if (!expiresAt) return true;
  return Date.now() >= expiresAt;
};

export const getRemainingSessionMs = () => {
  const expiresAt = getSessionExpiresAt();
  if (!expiresAt) return 0;
  return Math.max(0, expiresAt - Date.now());
};

export const clearAuthStorage = () => {
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
};

const AUTH_SKIP_URL_PARTS = [
  '/user-account/login',
  '/user-account/logout',
  '/user-account/register',
  '/user-account/forgot-password',
  '/user-account/reset-password',
  '/student-details/register',
  '/student-details/verify',
  '/captcha',
];

export const shouldIgnoreUnauthorizedUrl = (url = '') => {
  const path = String(url);
  return AUTH_SKIP_URL_PARTS.some((part) => path.includes(part));
};
