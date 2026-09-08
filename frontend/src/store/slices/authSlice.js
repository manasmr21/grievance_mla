import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userApi, masterApis } from '../../services/api/api';
import {
  AUTH_STORAGE_KEY,
  SESSION_DURATION_MS,
  clearAuthStorage,
} from '../../utils/session';
import {
  EMPTY_ASSIGNED_DEPARTMENTS,
  getDepartmentListKey,
  normalizeAssignedDepartments,
  resolveActiveDepartmentForRole,
} from '../../utils/departmentAuth';
import { invalidateMenuCache } from '../../services/navigation.service';

const STORAGE_KEY = AUTH_STORAGE_KEY;
const NOT_FOUND_LABEL = 'Not found';

const normalizeRoleRecord = (role) => {
  if (!role) return null;
  return {
    id: Number(role.id),
    code: role.code,
    name: role.name,
  };
};

const resolvePrimaryRole = async (dbUser, allRoles) => {
  const userRoleId = dbUser.role_id != null ? Number(dbUser.role_id) : null;

  let primaryRole = normalizeRoleRecord(dbUser.role);
  if (!primaryRole && userRoleId) {
    primaryRole = normalizeRoleRecord(allRoles.find((r) => Number(r.id) === userRoleId));
  }
  if (!primaryRole && userRoleId) {
    try {
      const roleRes = await masterApis.getRolesById(userRoleId);
      if (roleRes?.success && roleRes.data) {
        primaryRole = normalizeRoleRecord(roleRes.data);
      }
    } catch (e) {
      console.error('Error fetching role by id:', e);
    }
  }
  if (!primaryRole && userRoleId) {
    primaryRole = { id: userRoleId, code: 'EMPLOYEE', name: 'Employee' };
  }
  return primaryRole;
};

const readStoredAuth = () => {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value);
    const expiresAt = Number(parsed?.expiresAt);
    if (Number.isFinite(expiresAt) && Date.now() >= expiresAt) {
      clearAuthStorage();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const persistAuthState = (partial) => {
  if (typeof window === 'undefined') return;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...parsed, ...partial }),
    );
  } catch {
    // ignore
  }
};

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await userApi.loginUser({ email, password });
      if (!response || !response.success || !response.user) {
        return rejectWithValue(response?.message || 'Invalid credentials or login failed');
      }

      const dbUser = response.user;

      let allRoles = [];
      try {
        const rolesRes = await masterApis.getRoles();
        if (rolesRes && rolesRes.success && rolesRes.data) {
          allRoles = rolesRes.data;
        }
      } catch (e) {
        console.error('Error fetching roles:', e);
      }

      const userRoleId = dbUser.role_id != null ? Number(dbUser.role_id) : null;
      const primaryRole = await resolvePrimaryRole(dbUser, allRoles);

      const primaryRoleString = primaryRole
        ? (primaryRole.code || primaryRole.name).toLowerCase()
        : 'employee';

      const sessionUser = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role_id: userRoleId,
        role: primaryRoleString,
      };

      let assignedDepartments = { ...EMPTY_ASSIGNED_DEPARTMENTS };
      const activeDepartmentsByRole = {};

      try {
        const employeeDetailsRes = await masterApis.getEmployeeDetails();
        if (employeeDetailsRes && employeeDetailsRes.success && employeeDetailsRes.data) {
          const detailedEmp = employeeDetailsRes.data.find(
            e => e.email && e.email.toLowerCase() === dbUser.email.toLowerCase()
          );
          if (detailedEmp) {
            sessionUser.employee_details_id = detailedEmp.id;
            sessionUser.department = detailedEmp.department?.name || NOT_FOUND_LABEL;
            sessionUser.title = detailedEmp.role?.name || NOT_FOUND_LABEL;
          }
        }
      } catch (err) {
        console.error('Failed to fetch detailed employee information:', err);
      }

      if (primaryRoleString !== 'admin') {
        try {
          const assignmentsRes = await masterApis.getMyDepartmentAssignments();
          if (assignmentsRes?.success && assignmentsRes.data) {
            assignedDepartments = normalizeAssignedDepartments(assignmentsRes.data);
          }
        } catch (err) {
          console.error('Failed to fetch department assignments:', err);
        }
      }

      const activeDepartment = resolveActiveDepartmentForRole(
        assignedDepartments,
        primaryRole,
        activeDepartmentsByRole,
      );

      const deptKey = getDepartmentListKey(primaryRole);
      if (deptKey && activeDepartment) {
        activeDepartmentsByRole[deptKey] = activeDepartment;
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            user: sessionUser,
            activeRole: primaryRole || null,
            assignedDepartments,
            activeDepartment,
            activeDepartmentsByRole,
            expiresAt: Date.now() + SESSION_DURATION_MS,
          }),
        );
      }

      return {
        user: sessionUser,
        activeRole: primaryRole || null,
        assignedDepartments,
        activeDepartment,
        activeDepartmentsByRole,
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
          document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname;
        }
      }
    } catch (e) {
      console.error('Error clearing cookies on frontend:', e);
    }

    try {
      await userApi.logoutUser();
    } catch (error) {
      console.error('Backend logout failed or was unreachable, clearing local state anyway:', error);
    }

    clearAuthStorage();
    invalidateMenuCache();
  }
);

const storedAuth = readStoredAuth();

const initialState = {
  user: storedAuth?.user || null,
  activeRole: storedAuth?.activeRole || null,
  assignedDepartments: normalizeAssignedDepartments(storedAuth?.assignedDepartments),
  activeDepartment: storedAuth?.activeDepartment || null,
  activeDepartmentsByRole: storedAuth?.activeDepartmentsByRole || {},
  role: storedAuth?.activeRole
    ? (storedAuth.activeRole.code || storedAuth.activeRole.name).toLowerCase()
    : null,
  isAuthenticated: Boolean(storedAuth?.user),
  status: 'idle',
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logoutAction: (state) => {
      state.user = null;
      state.activeRole = null;
      state.assignedDepartments = { ...EMPTY_ASSIGNED_DEPARTMENTS };
      state.activeDepartment = null;
      state.activeDepartmentsByRole = {};
      state.role = null;
      state.isAuthenticated = false;
      state.status = 'idle';
      state.error = null;
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    },
    setAssignedDepartments: (state, action) => {
      state.assignedDepartments = normalizeAssignedDepartments(action.payload);
      persistAuthState({ assignedDepartments: state.assignedDepartments });
    },
    setActiveDepartment: (state, action) => {
      const dept = action.payload;
      state.activeDepartment = dept || null;

      const key = getDepartmentListKey(state.activeRole);
      if (key) {
        if (dept) {
          state.activeDepartmentsByRole[key] = dept;
        } else {
          delete state.activeDepartmentsByRole[key];
        }
      }

      persistAuthState({
        activeDepartment: state.activeDepartment,
        activeDepartmentsByRole: state.activeDepartmentsByRole,
      });
    },
    setActiveRole: (state, action) => {
      const newRole = action.payload;
      state.activeRole = newRole;
      state.role = newRole ? (newRole.code || newRole.name).toLowerCase() : null;

      const key = getDepartmentListKey(newRole);
      if (key) {
        state.activeDepartment = resolveActiveDepartmentForRole(
          state.assignedDepartments,
          newRole,
          state.activeDepartmentsByRole,
        );
        if (state.activeDepartment) {
          state.activeDepartmentsByRole[key] = state.activeDepartment;
        }
      } else {
        state.activeDepartment = null;
      }

      persistAuthState({
        activeRole: newRole,
        activeDepartment: state.activeDepartment,
        activeDepartmentsByRole: state.activeDepartmentsByRole,
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.activeRole = action.payload.activeRole;
        state.assignedDepartments = action.payload.assignedDepartments;
        state.activeDepartment = action.payload.activeDepartment;
        state.activeDepartmentsByRole = action.payload.activeDepartmentsByRole;
        state.role = action.payload.activeRole
          ? (action.payload.activeRole.code || action.payload.activeRole.name).toLowerCase()
          : null;
        state.isAuthenticated = true;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
      })
      .addCase(logoutThunk.pending, (state) => {
        state.user = null;
        state.activeRole = null;
        state.assignedDepartments = { ...EMPTY_ASSIGNED_DEPARTMENTS };
        state.activeDepartment = null;
        state.activeDepartmentsByRole = {};
        state.role = null;
        state.isAuthenticated = false;
        state.status = 'loading';
        state.error = null;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.status = 'idle';
      })
      .addCase(logoutThunk.rejected, (state) => {
        state.status = 'idle';
      });
  },
});

export const {
  logoutAction,
  setActiveRole,
  setActiveDepartment,
  setAssignedDepartments,
} = authSlice.actions;
export default authSlice.reducer;
