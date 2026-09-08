import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchNotificationsThunk,
  markAllReadThunk,
  markAsReadThunk,
} from '../store/slices/notificationSlice';

export const useNotifications = () => {
  const dispatch = useDispatch();
  const notifications = useSelector((state) => state.notifications.list);
  const unreadCount = useSelector((state) => state.notifications.unreadCount);

  const fetchNotifications = useCallback(() => {
    return dispatch(fetchNotificationsThunk());
  }, [dispatch]);

  const markAllRead = useCallback(() => {
    return dispatch(markAllReadThunk());
  }, [dispatch]);

  const markAsRead = useCallback((id) => {
    return dispatch(markAsReadThunk(id));
  }, [dispatch]);

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    markAllRead,
    markAsRead,
  };
};

export default useNotifications;
