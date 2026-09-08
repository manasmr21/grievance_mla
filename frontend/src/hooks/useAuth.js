import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  loginThunk,
  logoutThunk,
  setActiveRole as setActiveRoleAction,
  setActiveDepartment as setActiveDepartmentAction,
  setAssignedDepartments as setAssignedDepartmentsAction,
} from '../store/slices/authSlice';
import { store } from '../store/store';
import { masterApis } from '../services/api/api';
import {
  emitActiveDepartmentChange,
  getDepartmentsForRole,
  isDepartmentScopedRole,
  normalizeAssignedDepartments,
  resolveActiveDepartmentForRole,
} from '../utils/departmentAuth';

export const useAuth = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const role = useSelector((state) => state.auth.role);
  const activeRole = useSelector((state) => state.auth.activeRole);
  const assignedDepartments = useSelector((state) => state.auth.assignedDepartments);
  const activeDepartment = useSelector((state) => state.auth.activeDepartment);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const status = useSelector((state) => state.auth.status);
  const error = useSelector((state) => state.auth.error);

  const login = useCallback(
    async (email, password) => {
      const resultAction = await dispatch(loginThunk({ email, password }));
      if (loginThunk.rejected.match(resultAction)) {
        throw new Error(resultAction.payload || 'Login failed');
      }
      return resultAction.payload;
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    await dispatch(logoutThunk());
  }, [dispatch]);

  const setActiveRole = useCallback(
    (roleObj) => {
      dispatch(setActiveRoleAction(roleObj));
      const { activeDepartment: nextActiveDepartment } = store.getState().auth;
      emitActiveDepartmentChange({ department: nextActiveDepartment });
    },
    [dispatch]
  );

  const setActiveDepartment = useCallback(
    (dept) => {
      dispatch(setActiveDepartmentAction(dept));
      emitActiveDepartmentChange({ department: dept });
    },
    [dispatch]
  );

  const getDefaultRouteForRole = useCallback((roleString) => {
    if (!roleString) return '/login';
    const roleLower = String(roleString).toLowerCase();
    if (roleLower === 'admin') return '/admin/dashboard';
    return '/staff/dashboard';
  }, []);

  const departmentsForActiveRole = useMemo(
    () => getDepartmentsForRole(assignedDepartments, activeRole),
    [assignedDepartments, activeRole],
  );

  const showDepartmentSwitcher = useMemo(
    () => isDepartmentScopedRole(activeRole) && departmentsForActiveRole.length > 1,
    [activeRole, departmentsForActiveRole.length],
  );

  const getDepartmentsForActiveRole = useCallback(
    () => departmentsForActiveRole,
    [departmentsForActiveRole],
  );

  useEffect(() => {
    if (!isAuthenticated || !user?.employee_details_id) {
      return undefined;
    }

    const totalAssignments =
      (assignedDepartments?.hod?.length || 0) +
      (assignedDepartments?.coordinator?.length || 0);
    if (totalAssignments > 0) {
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await masterApis.getMyDepartmentAssignments();
        if (cancelled || !res?.success || !res.data) {
          return;
        }

        const normalized = normalizeAssignedDepartments(res.data);
        dispatch(setAssignedDepartmentsAction(normalized));

        const { activeRole: currentActiveRole, activeDepartmentsByRole, activeDepartment } =
          store.getState().auth;

        if (!activeDepartment && isDepartmentScopedRole(currentActiveRole)) {
          const dept = resolveActiveDepartmentForRole(
            normalized,
            currentActiveRole,
            activeDepartmentsByRole,
          );
          if (dept) {
            dispatch(setActiveDepartmentAction(dept));
            emitActiveDepartmentChange({ department: dept });
          }
        }
      } catch (err) {
        console.error('Failed to hydrate department assignments:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    assignedDepartments?.coordinator?.length,
    assignedDepartments?.hod?.length,
    dispatch,
    isAuthenticated,
    user?.employee_details_id,
  ]);

  return {
    user,
    role,
    activeRole,
    assignedDepartments,
    activeDepartment,
    departmentsForActiveRole,
    showDepartmentSwitcher,
    isAuthenticated,
    status,
    error,
    login,
    logout,
    setActiveRole,
    setActiveDepartment,
    getDefaultRouteForRole,
    getDepartmentsForActiveRole,
  };
};

export default useAuth;
