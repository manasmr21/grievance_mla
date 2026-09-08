import React, { useState, useEffect, useMemo } from 'react';
import '../styles/admin/AdminShared.css';
import { masterApis } from '../services/api/api';
import ConfirmModal from '../components/UI/ConfirmModal';
import DebouncedSearchInput from '../components/UI/DebouncedSearchInput';
import PaginationPageNumbers from '../components/UI/PaginationPageNumbers';
import useDebouncedSearchFetch, { isAbortError } from '../hooks/useDebouncedSearchFetch';
import {
  getCustomFieldDisplay,
  getCustomFieldValue,
  buildCustomFieldsPayload,
  RoleColumnFields,
  ManageColumnsModal,
} from '../utils/customTableSchema';

const DepartmentManager = () => {
  const [departments, setDepartments] = useState([]);
  const [tableSchema, setTableSchema] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [roles, setRoles] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, confirmLabel: 'Delete', variant: 'danger' });
  const showConfirm = (opts) => setConfirmModal({ isOpen: true, confirmLabel: 'Delete', variant: 'danger', ...opts });
  const closeConfirm = () => setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('ASC');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalDepartments, setTotalDepartments] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const { debouncedSearch, handleSearchChange, abortSearch, createFetchController } =
    useDebouncedSearchFetch({ onPageReset: () => setPage(1) });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortOrder('ASC');
    }
    setPage(1);
  };

  const SortIcon = ({ field }) => {
    const isActive = sortField === field;
    return (
      <span className="sort-arrows-icon">
        {isActive ? (
          sortOrder === 'ASC' ? (
            <i className="fa-solid fa-sort-up"></i>
          ) : (
            <i className="fa-solid fa-sort-down"></i>
          )
        ) : (
          <i className="fa-solid fa-sort" style={{ opacity: 0.4 }}></i>
        )}
      </span>
    );
  };

  const fetchDepartments = async (pageNum = page, limitNum = limit) => {
    const controller = createFetchController();
    try {
      const response = await masterApis.getDepartments(
        pageNum,
        limitNum,
        sortField,
        sortOrder,
        debouncedSearch,
        { signal: controller.signal, includeCustomFields: true },
      );
      const depts = response?.data || response || [];
      setDepartments(Array.isArray(depts) ? depts : []);
      setTotalDepartments(response?.total !== undefined ? response.total : depts.length);
      setTotalPages(response?.totalPages !== undefined ? response.totalPages : 1);
    } catch (error) {
      if (isAbortError(error)) return;
      console.error("Error fetching departments:", error);
    }
  };

  const fetchTableSchema = async () => {
    try {
      const response = await masterApis.getTableSchema('department');
      setTableSchema(response?.data || response);
    } catch (error) {
      console.error('Error fetching department table schema:', error);
    }
  };

  useEffect(() => {
    fetchDepartments(page, limit);
  }, [page, limit, sortField, sortOrder, debouncedSearch]);

  useEffect(() => {
    fetchTableSchema();
    masterApis.getRoles()
      .then((res) => {
        const data = res?.data || res || [];
        setRoles(Array.isArray(data) ? data : []);
      })
      .catch(() => setRoles([]));
  }, []);

  const roleColumns = useMemo(() => {
    const columns = tableSchema?.columns || [];
    return columns
      .filter((col) => !col.is_system && col.field_kind === 'role_ref')
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }, [tableSchema]);

  const handleDelete = (id) => {
    showConfirm({
      title: 'Permanently Delete Department',
      message: 'Are you sure you want to PERMANENTLY delete this department? This action cannot be undone.',
      confirmLabel: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await masterApis.permanentDeleteDepartment(id);
          alert(response.message || 'Department permanently deleted successfully');
          fetchDepartments(page, limit);
        } catch (err) {
          alert(err.message || 'Error permanently deleting department');
        }
        closeConfirm();
      },
    });
  };

  const handleToggleStatus = async (dept) => {
    try {
      if (dept.is_active) {
        await masterApis.deleteDepartment(dept.id);
      } else {
        await masterApis.updateDepartment(dept.id, { is_active: true });
      }
      setDepartments((prev) =>
        prev.map((d) => (d.id === dept.id ? { ...d, is_active: !d.is_active } : d))
      );
    } catch (error) {
      alert(error.message || 'Error toggling department status');
      fetchDepartments(page, limit);
    }
  };

  const tableColSpan = 4 + roleColumns.length;

  return (
    <div className="cm-page">
      <div className="cm-hero">
        <div className="cm-hero-text">
          <h1 className="cm-title">Department Management</h1>
          <p className="cm-subtitle">Manage all departments across the institution.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="cm-btn cm-btn-outline" type="button" onClick={() => setIsManageColumnsOpen(true)}>
            <i className="fa-solid fa-table-columns" />
            Manage Columns
          </button>
          <button className="cm-btn cm-btn-primary" type="button" onClick={() => setIsAddModalOpen(true)}>
            <i className="fa-solid fa-plus" />
            Add Department
          </button>
        </div>
      </div>

      <div className="cm-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="cm-main-panel">
          <div className="cm-main-toolbar">
            <DebouncedSearchInput
              placeholder="Search departments..."
              onDebouncedChange={handleSearchChange}
              onTyping={abortSearch}
            />
          </div>

          <div className="cm-table-container">
            <table className="cm-table">
              <thead>
                <tr>
                  <th>
                    <button type="button" className={`table-header-sort-btn ${sortField === 'name' ? 'active' : ''}`} onClick={() => handleSort('name')}>
                      <span>Name</span>
                      <SortIcon field="name" />
                    </button>
                  </th>
                  <th>
                    <button type="button" className={`table-header-sort-btn ${sortField === 'code' ? 'active' : ''}`} onClick={() => handleSort('code')}>
                      <span>Code</span>
                      <SortIcon field="code" />
                    </button>
                  </th>
                  {roleColumns.map((col) => (
                    <th key={col.code} title={col.role_name || col.name}>
                      {col.name}
                    </th>
                  ))}
                  <th>
                    <button type="button" className={`table-header-sort-btn ${sortField === 'is_active' ? 'active' : ''}`} onClick={() => handleSort('is_active')}>
                      <span>Status</span>
                      <SortIcon field="is_active" />
                    </button>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.length > 0 ? (
                  departments.map((dept) => (
                    <tr key={dept.id}>
                      <td data-label="Name">
                        <div className="cm-subcat-name-cell">
                          <div className="cm-subcat-icon tone-blue">
                            <i className="fa-solid fa-building"></i>
                          </div>
                          <span>{dept.name}</span>
                        </div>
                      </td>
                      <td data-label="Code">{dept.code}</td>
                      {roleColumns.map((col) => (
                        <td key={col.code} data-label={col.name}>
                          {getCustomFieldDisplay(dept, col.code) || (
                            <span className="cm-text-slate" style={{ opacity: 0.7 }}>—</span>
                          )}
                        </td>
                      ))}
                      <td data-label="Status">
                        <div className="cm-status-toggle-wrap" onClick={() => handleToggleStatus(dept)} title={dept.is_active ? 'Click to deactivate' : 'Click to activate'}>
                          <div className={`cm-toggle-switch ${dept.is_active ? 'on' : 'off'}`}>
                            <div className="cm-toggle-knob" />
                          </div>
                          <span className={`cm-status-pill ${dept.is_active ? 'active' : 'inactive'}`}>
                            {dept.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td data-label="Actions">
                        <div className="cm-actions-group">
                          <button className="cm-action-btn edit-btn" aria-label="Edit" onClick={() => setEditingDept(dept)}>
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button className="cm-action-btn delete-btn" aria-label="Permanent Delete" onClick={() => handleDelete(dept.id)} title="Permanent Delete">
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={tableColSpan} className="cm-empty-state">No departments found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="cm-pagination">
            <div className="cm-page-info">
              Showing {totalDepartments === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, totalDepartments)} of {totalDepartments} departments
            </div>
            <div className="cm-page-controls">
              <button
                className="cm-page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <i className="fa-solid fa-chevron-left"></i>
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
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ManageColumnsModal
        isOpen={isManageColumnsOpen}
        onClose={() => setIsManageColumnsOpen(false)}
        onSuccess={async () => {
          await fetchTableSchema();
          await fetchDepartments(page, limit);
        }}
        tableCode="department"
        entityLabel="department"
        roleOnly
      />

      <AddDepartmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => fetchDepartments(page, limit)}
        roleColumns={roleColumns}
        roles={roles}
      />

      <EditDepartmentModal
        editingDept={editingDept}
        setEditingDept={setEditingDept}
        onSuccess={(updatedDept) =>
          setDepartments((prev) => prev.map((d) => (d.id === updatedDept.id ? { ...d, ...updatedDept } : d)))
        }
        roleColumns={roleColumns}
        roles={roles}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        entityName={confirmModal.entityName}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        showWarning={confirmModal.showWarning}
      />
    </div>
  );
};

export default DepartmentManager;

function AddDepartmentModal({ isOpen, onClose, onSuccess, roleColumns, roles }) {
  const [formData, setFormData] = useState({ name: "", code: "" });
  const [customFieldValues, setCustomFieldValues] = useState({});

  const handleCustomFieldChange = (code, value) => {
    setCustomFieldValues((prev) => ({ ...prev, [code]: value }));
  };

  const handleAdd = async () => {
    try {
      const payload = { ...formData };
      if (roleColumns.length > 0) {
        payload.custom_fields = buildCustomFieldsPayload(customFieldValues, roleColumns);
      }
      const response = await masterApis.createDepartment(payload);
      alert(response.message || "Department created successfully");
      onSuccess();
      onClose();
      setFormData({ name: "", code: "" });
      setCustomFieldValues({});
    } catch (error) {
      alert(error.message || "Error creating department");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cm-modal-overlay">
      <div className="cm-modal">
        <div className="cm-modal-header">
          <div>
            <h3 className="cm-modal-title">Add Department</h3>
            <p className="cm-modal-subtitle">Create a new department.</p>
          </div>
          <button className="cm-modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="cm-modal-body">
          <div className="cm-form-group">
            <label>Department Name <span className="cm-required">*</span></label>
            <input
              type="text"
              placeholder="Enter department name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="cm-form-group">
            <label>Department Code <span className="cm-required">*</span></label>
            <input
              type="text"
              className='uppercase'
              placeholder="Enter department code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            />
          </div>

          <RoleColumnFields
            customColumns={roleColumns}
            values={customFieldValues}
            onChange={handleCustomFieldChange}
            roles={roles}
          />
        </div>

        <div className="cm-modal-footer">
          <button className="cm-btn cm-btn-cancel" type="button" onClick={onClose}>Cancel</button>
          <button className="cm-btn cm-btn-primary" type="button" onClick={handleAdd}>Add Department</button>
        </div>
      </div>
    </div>
  );
}

function EditDepartmentModal({ editingDept, setEditingDept, onSuccess, roleColumns, roles }) {
  if (!editingDept) return null;

  const handleCustomFieldChange = (code, value) => {
    setEditingDept((prev) => ({
      ...prev,
      custom_fields: {
        ...(prev.custom_fields || {}),
        [code]: { value, display: value },
      },
    }));
  };

  const handleEdit = async () => {
    try {
      const payload = {
        name: editingDept.name,
        code: editingDept.code,
      };
      const customFieldsForSubmit = {};
      for (const col of roleColumns) {
        customFieldsForSubmit[col.code] = getCustomFieldValue(editingDept, col.code) || null;
      }
      if (roleColumns.length > 0) {
        payload.custom_fields = customFieldsForSubmit;
      }
      const response = await masterApis.updateDepartment(editingDept.id, payload);
      alert(response.message || "Department updated successfully");
      if (onSuccess) onSuccess(response.data || { id: editingDept.id, ...payload });
      setEditingDept(null);
    } catch (error) {
      alert(error.message || "Error updating department");
    }
  };

  return (
    <div className="cm-modal-overlay">
      <div className="cm-modal">
        <div className="cm-modal-header">
          <div>
            <h3 className="cm-modal-title">Edit Department</h3>
            <p className="cm-modal-subtitle">Update department details.</p>
          </div>
          <button className="cm-modal-close" onClick={() => setEditingDept(null)}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="cm-modal-body">
          <div className="cm-form-group">
            <label>Department Name <span className="cm-required">*</span></label>
            <input
              type="text"
              placeholder="Enter department name"
              value={editingDept.name}
              onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
            />
          </div>

          <div className="cm-form-group">
            <label>Department Code <span className="cm-required">*</span></label>
            <input
              type="text"
              className="uppercase"
              placeholder="Enter department code"
              value={editingDept.code || ''}
              onChange={(e) => setEditingDept({ ...editingDept, code: e.target.value.toUpperCase() })}
            />
          </div>

          <RoleColumnFields
            customColumns={roleColumns}
            values={Object.fromEntries(
              roleColumns.map((col) => [col.code, getCustomFieldValue(editingDept, col.code)]),
            )}
            onChange={handleCustomFieldChange}
            roles={roles}
          />
        </div>

        <div className="cm-modal-footer">
          <button className="cm-btn cm-btn-cancel" type="button" onClick={() => setEditingDept(null)}>Cancel</button>
          <button className="cm-btn cm-btn-primary" type="button" onClick={handleEdit}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
