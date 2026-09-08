import { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { userApi } from '../services/api/api.js';

const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const { isAuthenticated, role, logout } = useAuth();
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifyUser = async () => {
      if (!isAuthenticated) {
        if (isMounted) setIsValidating(false);
        return;
      }

      try {
        const response = await userApi.verifyUserAccount();
        if (isMounted) {
          if (response && response.success) {
            setIsValid(true);
          } else {
            setIsValid(false);
            if (logout) logout();
          }
        }
      } catch (error) {
        if (isMounted) {
          setIsValid(false);
          if (logout) logout();
        }
      } finally {
        if (isMounted) {
          setIsValidating(false);
        }
      }
    };

    verifyUser();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, logout]);

  if (isValidating) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated || !isValid) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles.length > 0 && role) {
    const roleLower = role.toLowerCase();
    const isEmployeeRole = roleLower !== 'admin' && roleLower !== 'student';
    const isAuthorized = allowedRoles.includes(roleLower)
      || (allowedRoles.includes('employee') && isEmployeeRole);

    if (!isAuthorized) {
      return <Navigate to="/unauthorized" replace state={{ from: location }} />;
    }
  }

  return children || <Outlet />;
};

export default ProtectedRoute;
