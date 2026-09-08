import React, { useCallback, useEffect, useMemo, useState } from 'react';
import '../styles/admin/AdminShared.css';
import '../styles/admin/CategoryManager.css';
import { masterApis } from '../services/api/api';
import DebouncedSearchInput from '../components/UI/DebouncedSearchInput';
import PaginationPageNumbers from '../components/UI/PaginationPageNumbers';
import useDebouncedSearchFetch, { isAbortError } from '../hooks/useDebouncedSearchFetch';
import { invalidateMenuCache } from '../services/navigation.service';

const EMPTY_FORM = {
  code: '',
  label: '',
  path: '',
  icon: 'fa-solid fa-circle',
  parent_id: '',
  sort_order: 0,
  is_active: true,
  role_ids: [],
};

const MenuManager = () => {
  const [menus, setMenus] = useState([]);
  const [allMenus, setAllMenus] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [deletingMenu, setDeletingMenu] = useState(null);

  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalMenus, setTotalMenus] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const { debouncedSearch, handleSearchChange, abortSearch, createFetchController } =
    useDebouncedSearchFetch({ onPageReset: () => setPage(1) });

  const menuById = useMemo(
    () => new Map(allMenus.map((menu) => [menu.id, menu])),
    [allMenus],
  );

  const fetchMenus = useCallback(async () => {
    setLoading(true);
    const controller = createFetchController();
    try {
      const response = await masterApis.getMenus(page, limit, debouncedSearch, { signal: controller.signal });
      const data = response?.data || response || [];
      const nextTotal = response?.total !== undefined ? response.total : data.length;
      const nextTotalPages = response?.totalPages !== undefined ? Math.max(1, response.totalPages) : 1;

      setMenus(Array.isArray(data) ? data : []);
      setTotalMenus(nextTotal);
      setTotalPages(nextTotalPages);

      if (page > nextTotalPages) {
        setPage(nextTotalPages);
      }
    } catch (error) {
      if (isAbortError(error)) return;
      console.error('Error fetching menus:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, createFetchController]);

  const fetchAllMenus = useCallback(async () => {
    try {
      const response = await masterApis.getMenuTree();
      const flat = response?.flat || [];
      setAllMenus(Array.isArray(flat) ? flat : []);
    } catch (error) {
      console.error('Error fetching menu tree:', error);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await masterApis.getRolesForMenu(1, 200, '');
      const data = response?.data || response || [];
      setRoles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  }, []);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  useEffect(() => {
    fetchAllMenus();
  }, [fetchAllMenus]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleDelete = async (id) => {
    try {
      const response = await masterApis.permanentDeleteMenu(id);
      alert(response?.message || 'Menu deleted successfully');
      setDeletingMenu(null);
      invalidateMenuCache();
      fetchMenus();
      fetchAllMenus();
    } catch (error) {
      alert(error?.message || 'Error deleting menu');
    }
  };

  const handleToggleStatus = async (menu) => {
    try {
      if (menu.is_active !== false) {
        await masterApis.deleteMenu(menu.id);
      } else {
        await masterApis.updateMenu(menu.id, { is_active: true });
      }
      invalidateMenuCache();
      fetchMenus();
      fetchAllMenus();
    } catch (error) {
      alert(error?.message || 'Error toggling menu status');
      fetchMenus();
    }
  };

  const openCreateModal = () => {
    setEditingMenu(null);
    setIsModalOpen(true);
  };

  const openEditModal = (menu) => {
    setEditingMenu(menu);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMenu(null);
  };

  const getParentLabel = (parentId) => {
    if (!parentId) return '—';
    const parent = menuById.get(parentId);
    return parent ? parent.label : `#${parentId}`;
  };

  return (
    <div className="cm-page">
      <div className="cm-hero">
        <div className="cm-hero-text">
          <h1 className="cm-title">Menu Manager</h1>
          <p className="cm-subtitle">Configure navigation menus and role-based access. Paths are stored without area prefix (e.g. /dashboard); /admin or /staff is added per role when serving menus.</p>
        </div>
        <button className="cm-btn cm-btn-primary" type="button" onClick={openCreateModal}>
          <i className="fa-solid fa-plus" />
          Add Menu
        </button>
      </div>

      <div className="cm-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="cm-main-panel">
          <div className="cm-main-toolbar">
            <DebouncedSearchInput
              placeholder="Search menus..."
              onDebouncedChange={handleSearchChange}
              onTyping={abortSearch}
            />
            <span className="cm-count-badge">{totalMenus} menu{totalMenus !== 1 ? 's' : ''}</span>
          </div>

          <div className="cm-table-container">
            {loading ? (
              <div className="cm-empty-state">Loading menus...</div>
            ) : (
              <table className="cm-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Code</th>
                    <th>URL</th>
                    <th>Parent</th>
                    <th>Roles</th>
                    <th>Order</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menus.length > 0 ? (
                    menus.map((menu, index) => (
                      <tr key={menu.id}>
                        <td data-label="#" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{(page - 1) * limit + index + 1}</td>
                        <td data-label="Name">
                          <div className="cm-subcat-name-cell">
                            <div className="cm-subcat-icon tone-blue">
                              <i className={menu.icon || 'fa-solid fa-circle'} />
                            </div>
                            <span>{menu.label}</span>
                          </div>
                        </td>
                        <td data-label="Code">
                          <code style={{
                            background: 'var(--primary-light)',
                            color: 'var(--primary-color)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}>
                            {menu.code}
                          </code>
                        </td>
                        <td data-label="URL">{menu.path || <span className="srr-meta">Parent group</span>}</td>
                        <td data-label="Parent">{getParentLabel(menu.parent_id)}</td>
                        <td data-label="Roles">
                          <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                            {(menu.roles || []).map((r) => r.code).join(', ') || '—'}
                          </span>
                        </td>
                        <td data-label="Order">{menu.sort_order ?? 0}</td>
                        <td data-label="Status">
                          <div className="cm-status-toggle-wrap" onClick={() => handleToggleStatus(menu)} title={menu.is_active !== false ? 'Click to deactivate' : 'Click to activate'}>
                            <div className={`cm-toggle-switch ${menu.is_active !== false ? 'on' : 'off'}`}>
                              <div className="cm-toggle-knob" />
                            </div>
                            <span className={`cm-status-pill ${menu.is_active !== false ? 'active' : 'inactive'}`}>
                              {menu.is_active !== false ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td data-label="Actions">
                          <div className="cm-actions-group">
                            <button
                              className="cm-action-btn edit-btn"
                              aria-label="Edit"
                              onClick={() => openEditModal(menu)}
                            >
                              <i className="fa-solid fa-pen" />
                            </button>
                            <button
                              className="cm-action-btn delete-btn"
                              aria-label="Delete"
                              onClick={() => setDeletingMenu(menu)}
                            >
                              <i className="fa-regular fa-trash-can" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="cm-empty-state">No menus found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="cm-pagination">
            <div className="cm-page-info">
              Showing {totalMenus === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, totalMenus)} of {totalMenus} menus
            </div>
            {totalPages > 1 && (
            <div className="cm-page-controls">
              <button
                className="cm-page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <i className="fa-solid fa-chevron-left" />
              </button>

              <PaginationPageNumbers
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                buttonClassName="cm-page-btn"
              />

              <button
                className="cm-page-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
            )}
          </div>
        </div>
      </div>

      <MenuFormModal
        isOpen={isModalOpen}
        editingMenu={editingMenu}
        menus={allMenus}
        roles={roles}
        onClose={closeModal}
        onSuccess={() => {
          invalidateMenuCache();
          fetchMenus();
          fetchAllMenus();
          closeModal();
        }}
      />

      {deletingMenu && (
        <div className="cm-modal-overlay">
          <div className="cm-modal">
            <div className="cm-modal-header">
              <div>
                <h3 className="cm-modal-title">Delete Menu</h3>
                <p className="cm-modal-subtitle">Permanently delete &quot;{deletingMenu.label}&quot;?</p>
              </div>
              <button className="cm-modal-close" onClick={() => setDeletingMenu(null)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="cm-modal-footer">
              <button className="cm-btn cm-btn-cancel" type="button" onClick={() => setDeletingMenu(null)}>Cancel</button>
              <button className="cm-btn cm-btn-danger" type="button" onClick={() => handleDelete(deletingMenu.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function MenuFormModal({ isOpen, editingMenu, menus, roles, onClose, onSuccess }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingMenu) {
      setFormData({
        code: editingMenu.code || '',
        label: editingMenu.label || '',
        path: editingMenu.path || '',
        icon: editingMenu.icon || 'fa-solid fa-circle',
        parent_id: editingMenu.parent_id ?? '',
        sort_order: editingMenu.sort_order ?? 0,
        is_active: editingMenu.is_active !== false,
        role_ids: editingMenu.role_ids || [],
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [isOpen, editingMenu]);

  if (!isOpen) return null;

  const parentOptions = menus.filter((menu) => menu.id !== editingMenu?.id);

  const toggleRole = (roleId) => {
    setFormData((prev) => {
      const exists = prev.role_ids.includes(roleId);
      return {
        ...prev,
        role_ids: exists
          ? prev.role_ids.filter((id) => id !== roleId)
          : [...prev.role_ids, roleId],
      };
    });
  };

  const handleSubmit = async () => {
    if (!formData.label.trim() || !formData.code.trim()) {
      alert('Menu name and code are required.');
      return;
    }

    const payload = {
      code: formData.code.trim(),
      label: formData.label.trim(),
      path: formData.path.trim() || null,
      icon: formData.icon.trim() || 'fa-solid fa-circle',
      parent_id: formData.parent_id === '' ? null : Number(formData.parent_id),
      sort_order: Number(formData.sort_order) || 0,
      is_active: formData.is_active,
      role_ids: formData.role_ids,
    };

    setSaving(true);
    try {
      const response = editingMenu
        ? await masterApis.updateMenu(editingMenu.id, payload)
        : await masterApis.createMenu(payload);
      alert(response?.message || 'Menu saved successfully');
      onSuccess();
    } catch (error) {
      alert(error?.message || 'Error saving menu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cm-modal-overlay">
      <div className="cm-modal" style={{ maxWidth: '640px' }}>
        <div className="cm-modal-header">
          <div>
            <h3 className="cm-modal-title">{editingMenu ? 'Edit Menu' : 'Add Menu'}</h3>
            <p className="cm-modal-subtitle">Define menu details and role access. Use relative paths like /dashboard — the backend adds /admin or /staff per role.</p>
          </div>
          <button className="cm-modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="cm-modal-body">
          <div className="cm-form-group">
            <label>Name <span className="cm-required">*</span></label>
            <input
              type="text"
              placeholder="e.g. Manage Users"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            />
          </div>

          <div className="cm-form-group">
            <label>Unique Code <span className="cm-required">*</span></label>
            <input
              type="text"
              placeholder="e.g. admin.users"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            />
          </div>

          <div className="cm-form-group">
            <label>URL</label>
            <input
              type="text"
              placeholder="e.g. /dashboard (leave empty for parent group)"
              value={formData.path}
              onChange={(e) => setFormData({ ...formData, path: e.target.value })}
            />
            <p className="cm-field-hint">Do not include /admin or /staff — that prefix is applied automatically from the assigned role.</p>
          </div>

          <div className="cm-form-group">
            <label>Icon</label>
            <input
              type="text"
              placeholder="e.g. fa-solid fa-users-gear"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            />
          </div>

          <div className="cm-form-group">
            <label>Parent Menu</label>
            <select
              value={formData.parent_id}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
            >
              <option value="">None (root level)</option>
              {parentOptions.map((menu) => (
                <option key={menu.id} value={menu.id}>{menu.label} ({menu.code})</option>
              ))}
            </select>
          </div>

          <div className="cm-form-group">
            <label>Sort Order</label>
            <input
              type="number"
              min="0"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
            />
          </div>

          <div className="cm-form-group">
            <label>Who Can Access</label>
            <p className="cm-field-hint">Leave unchecked to grant access to Admin only.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {roles.map((role) => {
                const checked = formData.role_ids.includes(role.id);
                return (
                  <label
                    key={role.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: checked ? '1px solid var(--primary-color)' : '1px solid #e2e8f0',
                      background: checked ? 'var(--primary-light)' : '#fff',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRole(role.id)}
                    />
                    {role.name} ({role.code})
                  </label>
                );
              })}
            </div>
          </div>

          <div className="cm-form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              Active
            </label>
          </div>
        </div>

        <div className="cm-modal-footer">
          <button className="cm-btn cm-btn-cancel" type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="cm-btn cm-btn-primary" type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : editingMenu ? 'Update Menu' : 'Add Menu'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MenuManager;
