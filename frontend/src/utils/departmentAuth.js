export const ACTIVE_DEPARTMENT_CHANGE_EVENT = 'grievance-active-department-change';

export const EMPTY_ASSIGNED_DEPARTMENTS = { hod: [], coordinator: [] };

export function getDepartmentListKey(role) {
  const code = (role?.code || role?.name || '').toUpperCase();
  if (code === 'HOD') return 'hod';
  if (code === 'COORDINATOR') return 'coordinator';
  return null;
}

export function isDepartmentScopedRole(role) {
  return Boolean(getDepartmentListKey(role));
}

export function normalizeAssignedDepartments(data) {
  if (!data || typeof data !== 'object') {
    return { ...EMPTY_ASSIGNED_DEPARTMENTS };
  }
  return {
    hod: Array.isArray(data.hod) ? data.hod : [],
    coordinator: Array.isArray(data.coordinator) ? data.coordinator : [],
  };
}

export function resolveActiveDepartmentForRole(
  assignedDepartments,
  role,
  activeDepartmentsByRole = {},
) {
  const key = getDepartmentListKey(role);
  if (!key) return null;

  const list = assignedDepartments?.[key] || [];
  if (list.length === 0) return null;

  const stored = activeDepartmentsByRole?.[key];
  if (stored && list.some((dept) => Number(dept.id) === Number(stored.id))) {
    return list.find((dept) => Number(dept.id) === Number(stored.id)) || list[0];
  }

  return [...list].sort((a, b) => a.name.localeCompare(b.name))[0];
}

export function getDepartmentsForRole(assignedDepartments, role) {
  const key = getDepartmentListKey(role);
  if (!key) return [];
  return assignedDepartments?.[key] || [];
}

export function emitActiveDepartmentChange(detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(ACTIVE_DEPARTMENT_CHANGE_EVENT, { detail }),
  );
}
