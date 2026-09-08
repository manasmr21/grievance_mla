import { configureStore, combineReducers } from '@reduxjs/toolkit';
import notificationsReducer from './slices/notificationSlice';
import authReducer from './slices/authSlice';
import usersReducer from './slices/usersSlice';
import typesReducer from './slices/typesSlice';
import { clearAuthStorage, getSessionExpiresAt } from '../utils/session';

// Slices to persist to localStorage
const PERSIST_WHITELIST = ['auth', 'users', 'types'];
const STORAGE_KEY = 'redux_persisted_state';

const emptyAuthState = {
  user: null,
  role: null,
  isAuthenticated: false,
  status: 'idle',
  error: null,
};

// Load persisted state from localStorage
function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    // Only return whitelisted slices
    const result = {};
    for (const key of PERSIST_WHITELIST) {
      if (parsed[key] !== undefined) {
        result[key] = parsed[key];
      }
    }

    // Do not restore a Redux auth session if the cookie/JWT session window is over
    if (result.auth?.isAuthenticated) {
      const expiresAt = getSessionExpiresAt();
      if (!expiresAt || Date.now() >= expiresAt) {
        clearAuthStorage();
        result.auth = emptyAuthState;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  } catch {
    return undefined;
  }
}

// Save whitelisted slices to localStorage
function savePersistedState(state) {
  try {
    const toPersist = {};
    for (const key of PERSIST_WHITELIST) {
      if (state[key] !== undefined) {
        toPersist[key] = state[key];
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
  } catch {
    // Ignore write errors (e.g. quota exceeded)
  }
}

const rootReducer = combineReducers({
  notifications: notificationsReducer,
  auth: authReducer,
  users: usersReducer,
  types: typesReducer,
});

const preloadedState = loadPersistedState();

export const store = configureStore({
  reducer: rootReducer,
  preloadedState,
});

// Subscribe to store changes and persist whitelisted slices
let debounceTimer;
store.subscribe(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    savePersistedState(store.getState());
  }, 300);
});

export default store;
