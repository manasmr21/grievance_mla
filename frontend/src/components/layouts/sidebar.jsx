import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useNavigation } from '../../hooks/useNavigation';
import { useNotifications } from '../../hooks/useNotifications';
import './sidebar.css';

const isNotificationMenuItem = (item) =>
  Boolean(item?.code?.endsWith('.notifications'));

const collectGroupCodes = (items, codes = []) => {
  for (const item of items) {
    if (!item.path && item.children?.length) {
      codes.push(item.code);
      collectGroupCodes(item.children, codes);
    }
  }
  return codes;
};

const findGroupCodeForPath = (items, pathname, parentCode = null) => {
  for (const item of items) {
    if (item.path) {
      if (pathname === item.path || pathname.startsWith(`${item.path}/`)) {
        return parentCode;
      }
      continue;
    }
    if (item.children?.length) {
      const found = findGroupCodeForPath(item.children, pathname, item.code);
      if (found) return found;
    }
  }
  return null;
};

const pathMatches = (path, pathname) =>
  path && (pathname === path || pathname.startsWith(`${path}/`));

const groupHasActiveDescendant = (item, pathname) => {
  if (!item.children?.length) return false;
  return item.children.some((child) => {
    if (child.path) return pathMatches(child.path, pathname);
    return groupHasActiveDescendant(child, pathname);
  });
};

const NavMenuItems = ({
  items,
  pathname,
  isCollapsed,
  onNavigate,
  unreadCount,
  openGroups,
  onToggleGroup,
  depth = 0,
}) => (
  <>
    {items.map((item) => {
      if (!item.path && item.children?.length) {
        const isOpen = openGroups[item.code] === true;
        const hasActiveChild = groupHasActiveDescendant(item, pathname);

        if (isCollapsed) {
          return (
            <NavMenuItems
              key={item.code}
              items={item.children}
              pathname={pathname}
              isCollapsed={isCollapsed}
              onNavigate={onNavigate}
              unreadCount={unreadCount}
              openGroups={openGroups}
              onToggleGroup={onToggleGroup}
              depth={depth}
            />
          );
        }

        return (
          <li key={item.code} className="sidebar-group">
            <button
              type="button"
              className={[
                'sidebar-group-toggle',
                isOpen ? 'is-open' : '',
                hasActiveChild ? 'is-active-parent' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onToggleGroup(item.code)}
              aria-expanded={isOpen}
            >
              <span className="sidebar-group-toggle-left">
                {item.icon && <i className={item.icon} aria-hidden="true" />}
                <span className="sidebar-group-label">{item.label}</span>
              </span>
              <i
                className={`fa-solid fa-chevron-down sidebar-group-chevron ${isOpen ? 'is-open' : ''}`}
                aria-hidden="true"
              />
            </button>
            <ul className={`sidebar-group-children ${isOpen ? 'is-open' : 'is-collapsed'}`}>
              <NavMenuItems
                items={item.children}
                pathname={pathname}
                isCollapsed={isCollapsed}
                onNavigate={onNavigate}
                unreadCount={unreadCount}
                openGroups={openGroups}
                onToggleGroup={onToggleGroup}
                depth={depth + 1}
              />
            </ul>
          </li>
        );
      }

      if (!item.path) return null;

      const showBadge = isNotificationMenuItem(item) && unreadCount > 0;
      const badge = showBadge ? String(unreadCount) : null;

      return (
        <li key={item.code} className={depth > 0 ? 'sidebar-group-item' : undefined}>
          <NavLink
            to={item.path}
            title={item.label}
            className={({ isActive }) => (isActive ? 'active' : '')}
            onClick={onNavigate}
          >
            {badge ? (
              <div className="icon-wrapper">
                <i className={item.icon} />
                <span className="badge mini" />
              </div>
            ) : (
              <i className={item.icon} />
            )}
            <span>{item.label}</span>
            {badge && <span className="badge">{badge}</span>}
          </NavLink>
        </li>
      );
    })}
  </>
);

const Sidebar = ({ isCollapsed, onNavigate }) => {
  const location = useLocation();
  const { items, subheader, isLoading } = useNavigation();
  const { unreadCount } = useNotifications();
  const [openGroups, setOpenGroups] = useState({});

  const groupCodes = useMemo(() => collectGroupCodes(items), [items]);

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const code of groupCodes) {
        if (next[code] === undefined) {
          next[code] = false;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [groupCodes]);

  useEffect(() => {
    const activeGroup = findGroupCodeForPath(items, location.pathname);
    if (!activeGroup) return;
    setOpenGroups((prev) => {
      if (prev[activeGroup] === true) return prev;
      return { ...prev, [activeGroup]: true };
    });
  }, [location.pathname, items]);

  const handleToggleGroup = useCallback((code) => {
    setOpenGroups((prev) => ({
      ...prev,
      [code]: prev[code] !== true,
    }));
  }, []);

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-icon">
          <span className="sidebar-brand-mark">MLA</span>
        </div>
        <div className="logo-text">
          <h2>MLA Connect</h2>
          <p>{subheader}</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul className="sidebar-menu-root">
          {isLoading ? (
            <li className="sidebar-loading">Loading menu...</li>
          ) : (
            <NavMenuItems
              items={items}
              pathname={location.pathname}
              isCollapsed={isCollapsed}
              onNavigate={onNavigate}
              unreadCount={unreadCount}
              openGroups={openGroups}
              onToggleGroup={handleToggleGroup}
            />
          )}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
