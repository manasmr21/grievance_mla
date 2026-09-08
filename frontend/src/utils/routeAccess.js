const AREA_PREFIX_PATTERN = /^\/(admin|staff|hod)(?=\/|$)/i;

export function normalizeRoleCode(role) {
  return String(role?.code || role?.name || role || '').toLowerCase();
}

export function getRouteArea(pathname) {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/staff') || pathname.startsWith('/hod')) return 'staff';
  return null;
}

/** Strip /admin, /staff, or /hod so menu paths can be compared reliably. */
export function normalizeRoutePath(pathname) {
  if (!pathname) return '';
  let normalized = String(pathname).replace(AREA_PREFIX_PATTERN, '');
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  return normalized === '/' ? '' : normalized;
}

/**
 * Returns true when pathname is allowed by the role menu path list.
 * @param {string} pathname
 * @param {string[]} allowedPaths
 */
export function isRouteAllowedForMenu(pathname, allowedPaths) {
  if (!pathname || !Array.isArray(allowedPaths) || allowedPaths.length === 0) {
    return true;
  }

  const pathNorm = normalizeRoutePath(pathname);

  return allowedPaths.some((allowed) => {
    const allowedNorm = normalizeRoutePath(allowed);
    return (
      pathname === allowed
      || pathname.startsWith(`${allowed}/`)
      || (pathNorm && allowedNorm && (
        pathNorm === allowedNorm || pathNorm.startsWith(`${allowedNorm}/`)
      ))
    );
  });
}

/**
 * Returns true when the user may stay on pathname after switching to roleStr.
 * Uses menu paths when provided; falls back to coarse area rules.
 */
export function isRouteAllowedForRole(pathname, role, allowedPaths) {
  if (!pathname) {
    return true;
  }

  if (allowedPaths?.length) {
    return isRouteAllowedForMenu(pathname, allowedPaths);
  }

  const roleCode = normalizeRoleCode(role);
  const area = getRouteArea(pathname);

  if (roleCode === 'admin') {
    return area === 'admin';
  }

  return area === 'staff';
}
