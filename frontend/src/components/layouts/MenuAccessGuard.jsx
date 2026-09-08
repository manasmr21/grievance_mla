import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '../../hooks/useNavigation';
import { getRouteArea, isRouteAllowedForMenu, normalizeRoleCode } from '../../utils/routeAccess';

function flattenMenuPaths(items, paths = []) {
  for (const item of items || []) {
    if (item.path) paths.push(item.path);
    if (item.children?.length) flattenMenuPaths(item.children, paths);
  }
  return paths;
}

/**
 * Blocks direct URL access to routes not present in the active role menu.
 */
const MenuAccessGuard = ({ children }) => {
  const location = useLocation();
  const { role, activeRole, getDefaultRouteForRole } = useAuth();
  const { allowedPaths, items, isLoading } = useNavigation();

  const menuPaths = useMemo(
    () => flattenMenuPaths(items),
    [items],
  );

  const effectivePaths = menuPaths.length ? menuPaths : allowedPaths;

  if (isLoading) {
    return children;
  }

  const pathname = location.pathname;
  const roleSource = activeRole || role;
  const defaultRoute = getDefaultRouteForRole(
    typeof roleSource === 'object' ? (roleSource.code || roleSource.name) : roleSource,
  );
  const roleCode = normalizeRoleCode(roleSource);
  const expectedArea = roleCode === 'admin' ? 'admin' : 'staff';

  if (pathname === defaultRoute) {
    return children;
  }

  if (isRouteAllowedForMenu(pathname, effectivePaths)) {
    return children;
  }

  // Menu not configured yet — allow routes within the user's portal area only
  if (effectivePaths.length === 0 && getRouteArea(pathname) === expectedArea) {
    return children;
  }

  return <Navigate to="/unauthorized" replace state={{ from: location }} />;
};

export default MenuAccessGuard;
