import React, { useEffect, useState } from 'react';
import { masterApis } from '../services/api/api';
import ConfirmModal from '../components/UI/ConfirmModal';

export const toSnakeCase = (value) =>
  (value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

export const toEmployeeColumnCode = (value) => {
  const slug = (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  return slug ? `default_${slug}_employee_id` : '';
};

export const toRoleColumnCode = (value) => {
  const slug = (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  return slug ? `default_${slug}_role_id` : '';
};

export const sortCustomColumns = (columns) => {
  const kindRank = (kind) => {
    if (kind === 'text') return 0;
    if (kind === 'employee_ref') return 1;
    if (kind === 'role_ref') return 2;
    return 3;
  };

  return [...columns].sort((a, b) => {
    const byKind = kindRank(a.field_kind) - kindRank(b.field_kind);
    if (byKind !== 0) return byKind;
    return (a.display_order ?? 0) - (b.display_order ?? 0);
  });
};

export const getCustomFieldDisplay = (record, columnCode) => {
  const field = record?.custom_fields?.[columnCode];
  if (!field) return '';
  if (typeof field === 'object') return field.display || field.value || '';
  return String(field);
};

export const getCustomFieldValue = (record, columnCode) => {
  const field = record?.custom_fields?.[columnCode];
  if (!field) return '';
  if (typeof field === 'object') return field.value || '';
  return String(field);
};

export const buildCustomFieldsPayload = (formCustomFields = {}, customColumns = []) => {
  const payload = {};
  for (const col of customColumns) {
    const raw = formCustomFields[col.code];
    payload[col.code] = raw === undefined || raw === '' ? null : raw;
  }
  return payload;
};

export function RoleColumnFields({ customColumns, values, onChange, roles = [] }) {
  if (!customColumns.length) return null;

  return customColumns.map((col) => (
    <div className="cm-form-group" key={col.code}>
      <label>{col.name}</label>
      <select
        value={values[col.code] || ''}
        onChange={(e) => onChange(col.code, e.target.value)}
      >
        <option value="">-- Select Role (Optional) --</option>
        {roles.filter((role) => role.is_active !== false || String(role.id) === String(values[col.code])).map((role) => (
          <option key={role.id} value={role.id}>
            {role.name} ({role.code})
          </option>
        ))}
      </select>
    </div>
  ));
}

export function CustomColumnFields({ customColumns, values, onChange, employees = [] }) {
  if (!customColumns.length) return null;

  return customColumns.map((col) => (
    <div className="cm-form-group" key={col.code}>
      <label>{col.name}</label>
      {col.field_kind === 'employee_ref' ? (
        <select
          value={values[col.code] || ''}
          onChange={(e) => onChange(col.code, e.target.value)}
        >
          <option value="">-- Select Employee (Optional) --</option>
          {employees.filter((emp) => emp.is_active !== false || emp.id === values[col.code]).map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name} ({emp.email})
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          placeholder={`Enter ${col.name.toLowerCase()}`}
          value={values[col.code] || ''}
          onChange={(e) => onChange(col.code, e.target.value)}
        />
      )}
    </div>
  ));
}

export function HostelDesignationFields({ customColumns, values, onChange, employees = [] }) {
  if (!customColumns.length) return null;

  return customColumns.map((col) => (
    <div className="form-group" key={col.code}>
      <label className="form-group-label" htmlFor={`hostel-designation-${col.code}`}>
        {col.name}
      </label>
      <div className="form-input-group">
        <div className="dropdown-wrapper">
          <select
            id={`hostel-designation-${col.code}`}
            className="form-input-themed border-orange dropdown-select"
            value={values[col.code] || ''}
            onChange={(e) => onChange(col.code, e.target.value)}
            style={{ paddingLeft: '16px' }}
          >
            <option value="">Select {col.name} (Optional)</option>
            {employees.filter((emp) => emp.is_active !== false || emp.id === values[col.code]).map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          <i className="fa-solid fa-chevron-down dropdown-chevron"></i>
        </div>
      </div>
    </div>
  ));
}

export function ManageColumnsModal({
  isOpen,
  onClose,
  onSuccess,
  tableCode,
  entityLabel = 'entity',
  employeeOnly = false,
  roleOnly = false,
}) {
  const [columns, setColumns] = useState([]);
  const [mode, setMode] = useState('list');
  const [editingColumn, setEditingColumn] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [fieldKind, setFieldKind] = useState(
    roleOnly ? 'role_ref' : employeeOnly ? 'employee_ref' : 'text',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, column: null });
  const [deleteErrorModal, setDeleteErrorModal] = useState({ isOpen: false, message: '' });
  const [codeTouched, setCodeTouched] = useState(false);

  const loadColumns = async () => {
    setIsLoading(true);
    try {
      const response = await masterApis.getTableSchema(tableCode);
      const allColumns = response?.data?.columns || response?.columns || [];
      setColumns(sortCustomColumns(allColumns.filter((col) => !col.is_system)));
    } catch (error) {
      console.error('Error loading columns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setCode('');
    setFieldKind(roleOnly ? 'role_ref' : employeeOnly ? 'employee_ref' : 'text');
    setCodeTouched(false);
    setEditingColumn(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    resetForm();
    setMode('list');
    setDeleteConfirm({ isOpen: false, column: null });
    setDeleteErrorModal({ isOpen: false, message: '' });
    loadColumns();
  }, [isOpen, tableCode]);

  useEffect(() => {
    if (mode !== 'add') return;
    if (fieldKind === 'employee_ref') {
      setCode(toEmployeeColumnCode(name));
      return;
    }
    if (fieldKind === 'role_ref') {
      setCode(toRoleColumnCode(name));
      return;
    }
    if (!codeTouched) {
      setCode(toSnakeCase(name));
    }
  }, [name, codeTouched, mode, fieldKind]);

  const startAdd = () => {
    resetForm();
    setMode('add');
  };

  const startEdit = (column) => {
    setEditingColumn(column);
    setName(column.name);
    setCode(column.code);
    setFieldKind(column.field_kind);
    setCodeTouched(true);
    setMode('edit');
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      alert('Column name is required.');
      return;
    }
    const resolvedFieldKind = roleOnly ? 'role_ref' : employeeOnly ? 'employee_ref' : fieldKind;
    if (resolvedFieldKind === 'text' && !code.trim()) {
      alert('Column code is required.');
      return;
    }
    if (resolvedFieldKind === 'employee_ref' && !toEmployeeColumnCode(name)) {
      alert('Column name must start with a letter for employee columns.');
      return;
    }
    if (resolvedFieldKind === 'role_ref' && !toRoleColumnCode(name)) {
      alert('Column name must start with a letter for role columns.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        field_kind: resolvedFieldKind,
      };
      if (resolvedFieldKind === 'text') {
        payload.code = code.trim();
      }
      const response = await masterApis.addTableColumn(tableCode, payload);
      alert(response.message || 'Column added successfully');
      await loadColumns();
      resetForm();
      setMode('list');
      onSuccess();
    } catch (error) {
      alert(error.message || 'Error adding column');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!name.trim()) {
      alert('Column name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await masterApis.updateTableColumn(tableCode, editingColumn.id, {
        name: name.trim(),
      });
      alert(response.message || 'Column updated successfully');
      await loadColumns();
      resetForm();
      setMode('list');
      onSuccess();
    } catch (error) {
      alert(error.message || 'Error updating column');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteConfirm = (col) => {
    setDeleteConfirm({ isOpen: true, column: col });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ isOpen: false, column: null });
  };

  const confirmDeleteColumn = async () => {
    const col = deleteConfirm.column;
    if (!col) return;

    try {
      await masterApis.deleteTableColumn(tableCode, col.id);
      closeDeleteConfirm();
      await loadColumns();
      onSuccess();
    } catch (error) {
      closeDeleteConfirm();
      setDeleteErrorModal({
        isOpen: true,
        message: error.message || 'Error deleting column',
      });
    }
  };

  if (!isOpen) return null;

  const fieldKindLabel = (kind) => {
    if (kind === 'employee_ref') return 'Employee';
    if (kind === 'role_ref') return 'Role';
    return 'Text';
  };
  const addLabel = roleOnly ? 'Add Role Column' : employeeOnly ? 'Add Designation' : 'Add Column';
  const listEmptyLabel = roleOnly
    ? 'No role columns yet. Add one to get started.'
    : employeeOnly
      ? 'No custom designations yet. Add one to get started.'
      : 'No custom columns yet. Add one to get started.';
  const columnSubtitle = (col) => {
    if (col.field_kind === 'role_ref') {
      return `${col.code} • Role column`;
    }
    return `${col.code} • ${fieldKindLabel(col.field_kind)}`;
  };

  return (
    <>
      <div className="cm-modal-overlay">
        <div className="cm-modal" style={{ maxWidth: '560px' }}>
          <div className="cm-modal-header">
            <div>
              <h3 className="cm-modal-title">
                {roleOnly ? 'Manage Role Columns' : employeeOnly ? 'Manage Designations' : 'Manage Columns'}
              </h3>
              <p className="cm-modal-subtitle">
                {mode === 'list' && (
                  roleOnly
                    ? `View and edit ${entityLabel} role columns.`
                    : `View and edit custom ${entityLabel} ${employeeOnly ? 'designations' : 'columns'}.`
                )}
                {mode === 'add' && (
                  roleOnly ? 'Add a new role column.' : employeeOnly ? 'Add a new employee designation.' : 'Add a new custom column.'
                )}
                {mode === 'edit' && 'Edit column display name.'}
              </p>
            </div>
            <button className="cm-modal-close" type="button" onClick={onClose}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="cm-modal-body">
            {mode === 'list' && (
              <>
                {isLoading ? (
                  <div style={{ padding: '12px', color: '#64748b' }}>Loading columns...</div>
                ) : columns.length === 0 ? (
                  <div style={{ padding: '12px', color: '#64748b', marginBottom: '12px' }}>
                    {listEmptyLabel}
                  </div>
                ) : (
                  <div style={{ marginBottom: '16px' }}>
                    {columns.map((col) => (
                      <div
                        key={col.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          padding: '10px 12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          marginBottom: '8px',
                          background: '#f8fafc',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{col.name}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            {columnSubtitle(col)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button
                            className="cm-action-btn edit-btn"
                            type="button"
                            aria-label="Edit column"
                            onClick={() => startEdit(col)}
                          >
                            <i className="fa-solid fa-pen" />
                          </button>
                          <button
                            className="cm-action-btn delete-btn"
                            type="button"
                            aria-label="Delete column"
                            onClick={() => openDeleteConfirm(col)}
                            title="Delete column (only if empty)"
                          >
                            <i className="fa-regular fa-trash-can" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button className="cm-btn cm-btn-outline" type="button" onClick={startAdd} style={{ width: '100%' }}>
                  <i className="fa-solid fa-plus" /> {addLabel}
                </button>
              </>
            )}

            {(mode === 'add' || mode === 'edit') && (
              <>
                <div className="cm-form-group">
                  <label>
                    {roleOnly ? 'Column Name' : employeeOnly ? 'Designation Name' : 'Column Name'}{' '}
                    <span className="cm-required">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={roleOnly ? 'e.g. Primary Role' : employeeOnly ? 'e.g. Caretaker' : 'e.g. Building Name'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="cm-form-group">
                  <label>Column Code</label>
                  <input
                    type="text"
                    placeholder={
                      fieldKind === 'employee_ref'
                        ? 'e.g. default_caretaker_employee_id'
                        : fieldKind === 'role_ref'
                          ? 'e.g. default_primary_role_role_id'
                          : 'e.g. BUILDING_NAME'
                    }
                    value={code}
                    readOnly={mode === 'edit' || fieldKind === 'employee_ref' || fieldKind === 'role_ref'}
                    disabled={mode === 'edit' || fieldKind === 'employee_ref' || fieldKind === 'role_ref'}
                    onChange={(e) => {
                      setCodeTouched(true);
                      setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''));
                    }}
                    style={(mode === 'edit' || fieldKind === 'employee_ref' || fieldKind === 'role_ref') ? { background: '#f1f5f9', cursor: 'not-allowed' } : undefined}
                  />
                  {mode === 'add' && fieldKind === 'text' && !employeeOnly && !roleOnly && (
                    <small style={{ color: '#64748b' }}>Uppercase letters, numbers, and underscores only.</small>
                  )}
                  {mode === 'add' && fieldKind === 'employee_ref' && (
                    <small style={{ color: '#64748b' }}>Auto-generated as default_[name]_employee_id</small>
                  )}
                  {mode === 'add' && fieldKind === 'role_ref' && (
                    <small style={{ color: '#64748b' }}>Auto-generated as default_[name]_role_id. Each department picks its own role for this column.</small>
                  )}
                </div>

                {!employeeOnly && !roleOnly && (
                  <div className="cm-form-group">
                    <label>Column Type</label>
                    {mode === 'edit' ? (
                      <input
                        type="text"
                        value={fieldKindLabel(fieldKind)}
                        readOnly
                        disabled
                        style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="field_kind"
                            value="text"
                            checked={fieldKind === 'text'}
                            onChange={() => {
                              setFieldKind('text');
                              setCodeTouched(false);
                            }}
                          />
                          <span>
                            <strong>Text</strong>
                            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Store plain text (building, room number, notes)</div>
                          </span>
                        </label>
                        <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="field_kind"
                            value="employee_ref"
                            checked={fieldKind === 'employee_ref'}
                            onChange={() => {
                              setFieldKind('employee_ref');
                              setCodeTouched(false);
                            }}
                          />
                          <span>
                            <strong>Employee</strong>
                            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Link to an employee with a dropdown picker</div>
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

          </div>

          <div className="cm-modal-footer">
            {mode === 'list' ? (
              <button className="cm-btn cm-btn-cancel" type="button" onClick={onClose}>Close</button>
            ) : (
              <>
                <button
                  className="cm-btn cm-btn-cancel"
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('list');
                  }}
                  disabled={isSubmitting}
                >
                  Back
                </button>
                <button
                  className="cm-btn cm-btn-primary"
                  type="button"
                  onClick={mode === 'edit' ? handleEdit : handleAdd}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : addLabel}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDeleteColumn}
        title="Delete Column"
        message={
          deleteConfirm.column
            ? `Are you sure you want to delete "${deleteConfirm.column.name}"? This column can only be removed if no ${entityLabel}s have data in it.`
            : 'Are you sure you want to delete this column?'
        }
        confirmLabel="Delete Column"
        variant="warning"
        showWarning
      />

      <ConfirmModal
        isOpen={deleteErrorModal.isOpen}
        onClose={() => setDeleteErrorModal({ isOpen: false, message: '' })}
        onConfirm={() => setDeleteErrorModal({ isOpen: false, message: '' })}
        title="Cannot Delete Column"
        message={deleteErrorModal.message}
        confirmLabel="OK"
        variant="warning"
        showWarning={false}
        hideSubtitle
      />
    </>
  );
}
