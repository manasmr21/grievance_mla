import React, { useState, useEffect } from 'react';
import '../styles/admin/AdminShared.css';
import { masterApis } from '../services/api/api';
import DebouncedSearchInput from '../components/UI/DebouncedSearchInput';
import useDebouncedSearchFetch, { isAbortError } from '../hooks/useDebouncedSearchFetch';

const RoleManager = () => {
  const [roles, setRoles] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deletingRole, setDeletingRole] = useState(null);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const limit = 20;
  const [totalRoles, setTotalRoles] = useState(0);

  const { debouncedSearch, handleSearchChange, abortSearch, createFetchController } =
    useDebouncedSearchFetch({ onPageReset: () => setPage(1) });

  const fetchRoles = async () => {
    setLoading(true);
    const controller = createFetchController();
    try {
      const response = await masterApis.getRoles(page, limit, debouncedSearch, { signal: controller.signal });
      const data = response?.data || response || [];
      setRoles(Array.isArray(data) ? data : []);
      setTotalRoles(response?.total !== undefined ? response.total : data.length);
    } catch (error) {
      if (isAbortError(error)) return;
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [debouncedSearch, page]);

  const handleDelete = async (id) => {
    try {
      const response = await masterApis.permanentDeleteRole(id);
      alert(response?.message || 'Role permanently deleted successfully');
      setDeletingRole(null);
      fetchRoles();
    } catch (error) {
      alert(error?.message || 'Error permanently deleting role');
    }
  };

  const handleToggleStatus = async (role) => {
    try {
      if (role.is_active !== false) {
        await masterApis.deleteRole(role.id);
      } else {
        await masterApis.updateRole(role.id, { is_active: true });
      }
      setRoles((prev) =>
        prev.map((r) => (r.id === role.id ? { ...r, is_active: !(role.is_active !== false) } : r))
      );
    } catch (error) {
      alert(error?.message || 'Error toggling role status');
      fetchRoles();
    }
  };

  return (
    <div className="cm-page">
      <div className="cm-hero">
        <div className="cm-hero-text">
          <h1 className="cm-title">Role Manager</h1>
          <p className="cm-subtitle">Define and manage system roles assigned to users.</p>
        </div>
        <button className="cm-btn cm-btn-primary" type="button" onClick={() => setIsAddModalOpen(true)}>
          <i className="fa-solid fa-plus" />
          Add Role
        </button>
      </div>

      <div className="cm-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="cm-main-panel">
          <div className="cm-main-toolbar">
            <DebouncedSearchInput
              placeholder="Search roles..."
              onDebouncedChange={handleSearchChange}
              onTyping={abortSearch}
            />
            <span className="cm-count-badge">{totalRoles} role{totalRoles !== 1 ? 's' : ''}</span>
          </div>

          <div className="cm-table-container">
            {loading ? (
              <div className="cm-empty-state">Loading roles...</div>
            ) : (
              <table className="cm-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Role Name</th>
                    <th>Code</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.length > 0 ? (
                    roles.map((role, index) => (
                      <tr key={role.id}>
                        <td data-label="#" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{index + 1}</td>
                        <td data-label="Role Name">
                          <div className="cm-subcat-name-cell">
                            <div className="cm-subcat-icon tone-blue">
                              <i className="fa-solid fa-shield-halved"></i>
                            </div>
                            <span>{role.name}</span>
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
                            letterSpacing: '0.05em',
                          }}>
                            {role.code || '—'}
                          </code>
                        </td>
                        <td data-label="Status">
                          <div className="cm-status-toggle-wrap" onClick={() => handleToggleStatus(role)} title={role.is_active !== false ? 'Click to deactivate' : 'Click to activate'}>
                            <div className={`cm-toggle-switch ${role.is_active !== false ? 'on' : 'off'}`}>
                              <div className="cm-toggle-knob" />
                            </div>
                            <span className={`cm-status-pill ${role.is_active !== false ? 'active' : 'inactive'}`}>
                              {role.is_active !== false ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td data-label="Actions">
                          <div className="cm-actions-group">
                            <button
                              className="cm-action-btn edit-btn"
                              aria-label="Edit"
                              onClick={() => setEditingRole(role)}
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            <button
                              className="cm-action-btn delete-btn"
                              aria-label="Delete"
                              onClick={() => setDeletingRole(role)}
                            >
                              <i className="fa-regular fa-trash-can"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="cm-empty-state">
                        {loading ? 'Loading roles...' : 'No roles found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <AddRoleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchRoles}
      />

      <EditRoleModal
        editingRole={editingRole}
        setEditingRole={setEditingRole}
        onSuccess={fetchRoles}
      />

      <DeleteRoleModal
        role={deletingRole}
        onClose={() => setDeletingRole(null)}
        onConfirm={() => handleDelete(deletingRole?.id)}
      />
    </div>
  );
};

export default RoleManager;


function AddRoleModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ name: '', code: '', description: '' });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      alert('Role name and code are required.');
      return;
    }
    setSaving(true);
    try {
      const response = await masterApis.createRole({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || undefined,
      });
      alert(response?.message || 'Role created successfully');
      onSuccess();
      onClose();
      setFormData({ name: '', code: '', description: '' });
    } catch (error) {
      alert(error?.message || 'Error creating role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cm-modal-overlay">
      <div className="cm-modal">
        <div className="cm-modal-header">
          <div>
            <h3 className="cm-modal-title">Add Role</h3>
            <p className="cm-modal-subtitle">Create a new system role.</p>
          </div>
          <button className="cm-modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="cm-modal-body">
          <div className="cm-form-group">
            <label>Role Name <span className="cm-required">*</span></label>
            <input
              type="text"
              placeholder="e.g. Head of Department"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="cm-form-group">
            <label>Role Code <span className="cm-required">*</span></label>
            <input
              type="text"
              className="uppercase"
              placeholder="e.g. HOD"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              Short identifier used internally (uppercase).
            </small>
          </div>

        </div>

        <div className="cm-modal-footer">
          <button className="cm-btn cm-btn-cancel" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="cm-btn cm-btn-primary" type="button" onClick={handleAdd} disabled={saving}>
            {saving ? 'Saving...' : 'Add Role'}
          </button>
        </div>
      </div>
    </div>
  );
}


function EditRoleModal({ editingRole, setEditingRole, onSuccess }) {
  const [saving, setSaving] = useState(false);

  if (!editingRole) return null;

  const handleEdit = async () => {
    if (!editingRole.name?.trim() || !editingRole.code?.trim()) {
      alert('Role name and code are required.');
      return;
    }
    setSaving(true);
    try {
      const response = await masterApis.updateRole(editingRole.id, {
        name: editingRole.name.trim(),
        code: editingRole.code.trim().toUpperCase(),
        description: editingRole.description?.trim() || undefined,
      });
      alert(response?.message || 'Role updated successfully');
      setEditingRole(null);
      onSuccess();
    } catch (error) {
      alert(error?.message || 'Error updating role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cm-modal-overlay">
      <div className="cm-modal">
        <div className="cm-modal-header">
          <div>
            <h3 className="cm-modal-title">Edit Role</h3>
            <p className="cm-modal-subtitle">Update role details.</p>
          </div>
          <button className="cm-modal-close" onClick={() => setEditingRole(null)}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="cm-modal-body">
          <div className="cm-form-group">
            <label>Role Name <span className="cm-required">*</span></label>
            <input
              type="text"
              placeholder="e.g. Head of Department"
              value={editingRole.name || ''}
              onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
            />
          </div>

          <div className="cm-form-group">
            <label>Role Code <span className="cm-required">*</span></label>
            <input
              type="text"
              className="uppercase"
              placeholder="e.g. HOD"
              value={editingRole.code || ''}
              onChange={(e) => setEditingRole({ ...editingRole, code: e.target.value.toUpperCase() })}
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              Short identifier used internally (uppercase).
            </small>
          </div>

        </div>

        <div className="cm-modal-footer">
          <button className="cm-btn cm-btn-cancel" type="button" onClick={() => setEditingRole(null)} disabled={saving}>
            Cancel
          </button>
          <button className="cm-btn cm-btn-primary" type="button" onClick={handleEdit} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}


function DeleteRoleModal({ role, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  if (!role) return null;

  const handleConfirm = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };

  return (
    <div className="cm-modal-overlay">
      <div className="cm-modal" style={{ maxWidth: '420px' }}>
        <div className="cm-modal-header">
          <div>
            <h3 className="cm-modal-title">Delete Role</h3>
            <p className="cm-modal-subtitle">This action cannot be undone.</p>
          </div>
          <button className="cm-modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="cm-modal-body">
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            background: '#fff5f5',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '14px 16px',
          }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444', marginTop: '2px' }}></i>
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                Are you sure you want to delete the role <strong>"{role.name}"</strong>?
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Users currently assigned this role may lose access. This operation is irreversible.
              </p>
            </div>
          </div>
        </div>

        <div className="cm-modal-footer">
          <button className="cm-btn cm-btn-cancel" type="button" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button
            className="cm-btn"
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            style={{ background: '#ef4444', color: '#fff', border: 'none' }}
          >
            {deleting ? 'Deleting...' : 'Delete Role'}
          </button>
        </div>
      </div>
    </div>
  );
}
