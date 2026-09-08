import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationApi } from '../../services/api/api';

export const fetchNotificationsThunk = createAsyncThunk(
  'notifications/fetchNotifications',
  async (_, { rejectWithValue }) => {
    try {
      const res = await notificationApi.getNotifications();
      if (res && res.success && res.data) {
        return res.data;
      }
      return rejectWithValue(res?.message || 'Failed to fetch notifications');
    } catch (err) {
      return rejectWithValue(err.message || 'Error fetching notifications');
    }
  }
);

export const markAllReadThunk = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      const res = await notificationApi.markAllRead();
      if (res && res.success) {
        return true;
      }
      return rejectWithValue(res?.message || 'Failed to mark all read');
    } catch (err) {
      return rejectWithValue(err.message || 'Error marking all read');
    }
  }
);

export const markAsReadThunk = createAsyncThunk(
  'notifications/markAsRead',
  async (id, { rejectWithValue }) => {
    try {
      const res = await notificationApi.markAsRead(id);
      if (res && res.success) {
        return id;
      }
      return rejectWithValue(res?.message || `Failed to mark notification ${id} read`);
    } catch (err) {
      return rejectWithValue(err.message || `Error marking notification ${id} read`);
    }
  }
);

const initialState = {
  list: [],
  unreadCount: 0,
  toasts: [],
  status: 'idle',
  error: null,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      const notif = action.payload;
      // Prevent duplicate socket inserts
      if (!state.list.some(n => n.id === notif.id)) {
        state.list.unshift(notif);
        if (!notif.is_read) {
          state.unreadCount += 1;
        }
      }
    },
    addToast: (state, action) => {
      const { id, title, message, type = 'info' } = action.payload;
      state.toasts.push({ id, title, message, type });
    },
    removeToast: (state, action) => {
      const id = action.payload;
      state.toasts = state.toasts.filter(t => t.id !== id);
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchNotifications
      .addCase(fetchNotificationsThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchNotificationsThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
        state.unreadCount = action.payload.filter(n => !n.is_read).length;
      })
      .addCase(fetchNotificationsThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
      })
      // markAllRead (Optimistic update on pending)
      .addCase(markAllReadThunk.pending, (state) => {
        state.list = state.list.map(n => ({ ...n, is_read: true }));
        state.unreadCount = 0;
      })
      .addCase(markAllReadThunk.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
        state.status = 'failed';
      })
      // markAsRead (Optimistic update on pending)
      .addCase(markAsReadThunk.pending, (state, action) => {
        const id = action.meta.arg;
        const target = state.list.find(n => n.id === id);
        if (target && !target.is_read) {
          target.is_read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAsReadThunk.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
        state.status = 'failed';
      });
  },
});

export const { addNotification, addToast, removeToast } = notificationSlice.actions;
export default notificationSlice.reducer;
