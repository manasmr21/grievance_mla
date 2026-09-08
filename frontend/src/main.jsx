import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { Provider } from 'react-redux';
import store from './store/store';
import { NotificationSocketManager } from './components/NotificationSocketManager';
import SessionWatcher from './components/SessionWatcher';
import { addToast, removeToast } from './store/slices/notificationSlice';

// Global custom alert handler redirecting default alerts to Redux-based sliding toasts
window.alert = (message) => {
  const toastId = Date.now();
  const lower = String(message).toLowerCase();
  
  let type = 'info';
  let title = 'Notification';
  
  if (lower.includes('success') || lower.includes('successfully') || lower.includes('complete') || lower.includes('closed') || lower.includes('deactivated') || lower.includes('worked')) {
    type = 'success';
    title = 'Success';
  } else if (lower.includes('fail') || lower.includes('error') || lower.includes('invalid') || lower.includes('required') || lower.includes('must be') || lower.includes('cannot') || lower.includes('wrong') || lower.includes('please') || lower.includes('not found') || lower.includes('missing') || lower.includes('maximum')) {
    type = 'error';
    title = 'Error';
  }
  
  store.dispatch(addToast({
    id: toastId,
    title,
    message: String(message),
    type
  }));
  
  setTimeout(() => {
    store.dispatch(removeToast(toastId));
  }, 5000);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <NotificationSocketManager />
        <SessionWatcher />
        <App />
      </Provider>
    </BrowserRouter>
  </StrictMode>,
);
