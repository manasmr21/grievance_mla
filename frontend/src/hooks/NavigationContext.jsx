import React, {
  createContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './useAuth';
import {
  fetchMenuForRole,
  getPageMetaForPath,
  getSubheaderForRole,
  resolveMenuRoleCode,
  resolveApiMenuRoleCode,
  invalidateMenuCache,
} from '../services/navigation.service';

const EMPTY_MENU = { roleCode: '', items: [], allowedPaths: [] };

export const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  const { role, activeRole } = useAuth();
  const roleSource = activeRole || role;
  const resolvedRoleCode = useMemo(() => resolveMenuRoleCode(roleSource), [roleSource]);

  const [menu, setMenu] = useState(EMPTY_MENU);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadMenu = async () => {
      if (!roleSource) {
        setMenu(EMPTY_MENU);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        invalidateMenuCache(resolveApiMenuRoleCode(roleSource));
        const result = await fetchMenuForRole(roleSource, { bypassCache: true });
        if (!cancelled) {
          setMenu(result || EMPTY_MENU);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setMenu(EMPTY_MENU);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadMenu();

    return () => {
      cancelled = true;
    };
  }, [roleSource, resolvedRoleCode]);

  const subheader = useMemo(
    () => getSubheaderForRole(roleSource),
    [roleSource],
  );

  const getPageLabel = (pathname) => getPageMetaForPath(pathname, menu.items);

  const value = useMemo(
    () => ({
      roleCode: menu.roleCode || resolvedRoleCode,
      items: menu.items || [],
      allowedPaths: menu.allowedPaths || [],
      subheader,
      getPageLabel,
      isLoading,
      error,
    }),
    [menu, resolvedRoleCode, subheader, isLoading, error],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}
