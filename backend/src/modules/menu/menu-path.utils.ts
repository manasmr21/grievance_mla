import { ROLE_CODES } from '../../common/constants/priority.constants';

const AREA_PREFIX_PATTERN = /^\/(admin|staff|hod)(?=\/|$)/i;

/** Strip /admin, /staff, /hod so menus store paths like /dashboard, /categories. */
export function normalizeStoredMenuPath(path: string | null | undefined): string | null {
  if (path == null) return null;
  const trimmed = String(path).trim();
  if (!trimmed) return null;

  let normalized = trimmed.replace(AREA_PREFIX_PATTERN, '');
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  return normalized === '/' ? null : normalized;
}

/** Area prefix applied when serving menus for a role. */
export function getRoleMenuPathPrefix(roleCode: string): string {
  const code = String(roleCode || '').trim().toUpperCase();
  if (code === ROLE_CODES.ADMIN) {
    return '/admin';
  }
  return '/staff';
}

/** Build frontend route from stored menu path + role prefix. */
export function resolveMenuPathForRole(
  storedPath: string | null | undefined,
  roleCode: string,
): string | null {
  const relative = normalizeStoredMenuPath(storedPath);
  if (!relative) return null;

  const prefix = getRoleMenuPathPrefix(roleCode);
  if (relative === prefix || relative.startsWith(`${prefix}/`)) {
    return relative;
  }

  return `${prefix}${relative}`;
}
