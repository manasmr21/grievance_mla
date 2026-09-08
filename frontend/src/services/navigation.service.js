import {
  ROLE_CODE_ALIASES,
  DEFAULT_MENU_ROLE_CODE,
  ROLE_SUBHEADERS,
  PAGE_SUBTITLES,
} from '../utils/menu.constants';
import { getMyMenu } from './api/navigation.api';

const menuCache = new Map();

export function resolveApiMenuRoleCode(role) {
  const raw = typeof role === 'object' && role !== null
    ? role.code || role.name || ''
    : role || '';
  const normalized = String(raw).trim().toUpperCase().replace(/\s+/g, '_');
  if (normalized) {
    return normalized;
  }
  return DEFAULT_MENU_ROLE_CODE;
}

export function resolveMenuRoleCode(role) {
  const raw = typeof role === 'object' && role !== null
    ? role.code || role.name || ''
    : role || '';
  const normalized = String(raw).trim().toUpperCase().replace(/\s+/g, '_');

  if (ROLE_CODE_ALIASES[String(raw).toLowerCase()]) {
    return ROLE_CODE_ALIASES[String(raw).toLowerCase()];
  }
  if (ROLE_CODE_ALIASES[normalized.toLowerCase()]) {
    return ROLE_CODE_ALIASES[normalized.toLowerCase()];
  }
  if (normalized) {
    return normalized;
  }
  return DEFAULT_MENU_ROLE_CODE;
}

function flattenMenuItems(items, acc = []) {
  for (const item of items || []) {
    if (item.path) acc.push(item);
    if (item.children?.length) flattenMenuItems(item.children, acc);
  }
  return acc;
}

/** Ensure sidebar links include /admin or /staff prefix when API returns relative paths. */
function applyPathPrefixToMenu(items, pathPrefix) {
  if (!Array.isArray(items) || !pathPrefix) return items || [];

  return items.map((item) => {
    let path = item.path;
    if (path && !path.startsWith('/admin') && !path.startsWith('/staff') && !path.startsWith('/hod')) {
      const suffix = path.startsWith('/') ? path : `/${path}`;
      path = `${pathPrefix}${suffix}`;
    }
    return {
      ...item,
      path,
      ...(item.children?.length
        ? { children: applyPathPrefixToMenu(item.children, pathPrefix) }
        : {}),
    };
  });
}

function buildAllowedPaths(items) {
  return flattenMenuItems(items).map((item) => item.path).filter(Boolean);
}

export function getPageMetaForPath(pathname, menuItems = []) {
  if (!pathname) return null;

  const pathsWithLabels = flattenMenuItems(menuItems)
    .sort((a, b) => b.path.length - a.path.length);

  const exact = pathsWithLabels.find((item) => item.path === pathname);
  if (exact) {
    return {
      title: exact.label,
      subtitle: PAGE_SUBTITLES[exact.path] || '',
    };
  }

  const prefix = pathsWithLabels.find(
    (item) => pathname.startsWith(`${item.path}/`),
  );
  if (prefix) {
    return {
      title: prefix.label,
      subtitle: PAGE_SUBTITLES[prefix.path] || '',
    };
  }

  return null;
}

export function getSubheaderForRole(role) {
  if (typeof role === 'object' && role !== null) {
    const label = role.name || role.code;
    if (label) {
      const formatted = String(label).replace(/_/g, ' ');
      return /dashboard/i.test(formatted) ? formatted : `${formatted} Dashboard`;
    }
  }

  const roleCode = resolveMenuRoleCode(role);
  return ROLE_SUBHEADERS[roleCode] || `${roleCode.replace(/_/g, ' ')} Dashboard`;
}

export async function fetchMenuForRole(role, { bypassCache = false } = {}) {
  const apiRoleCode = resolveApiMenuRoleCode(role);

  if (!bypassCache && menuCache.has(apiRoleCode)) {
    return menuCache.get(apiRoleCode);
  }

  const data = await getMyMenu(apiRoleCode);
  const pathPrefix = data.pathPrefix || (apiRoleCode === 'ADMIN' ? '/admin' : '/staff');
  const items = applyPathPrefixToMenu(data.items || [], pathPrefix);
  // Always derive from prefixed sidebar items so guard paths match NavLink targets.
  const allowedPaths = buildAllowedPaths(items);

  const normalized = {
    roleCode: data.roleCode || apiRoleCode,
    pathPrefix,
    items,
    allowedPaths,
  };
  menuCache.set(apiRoleCode, normalized);
  return normalized;
}

export function invalidateMenuCache(roleCode) {
  if (roleCode) {
    menuCache.delete(String(roleCode).toUpperCase());
    return;
  }
  menuCache.clear();
}
