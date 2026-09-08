import React, { useEffect, useState } from 'react';
import '../styles/admin/AssignmentRules.css';
import '../styles/admin/GrievancePaths.css';
import '../styles/admin/AdminShared.css';
import { grievancePathApi, masterApis } from '../services/api/api';
import ConfirmModal from '../components/UI/ConfirmModal';
import Modal from '../components/UI/Modal';
import PaginationPageNumbers from '../components/UI/PaginationPageNumbers';

const MAX_NODE_ROLES = 5;

const emptyNode = (sequence = 0) => ({
  sequence,
  name: '',
  description: '',
  is_terminal: false,
  role_ids: [''],
});

const createDefaultFormState = (types = [], categories = [], priorities = []) => {
  const defaultType = types[0];
  const typeCategories = defaultType
    ? categories.filter((c) => Number(c.type_id) === Number(defaultType.id))
    : [];
  const defaultCat = typeCategories[0];

  return {
    name: '',
    type_id: defaultType?.id || '',
    assign_all_categories: false,
    category_id: defaultCat?.id || '',
    sub_category_id: '',
    priority_id: priorities[0]?.id || '',
    is_active: true,
    nodes: [emptyNode(0), emptyNode(1)],
  };
};

const GrievancePaths = () => {
  const [paths, setPaths] = useState([]);
  const [types, setTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editingPathId, setEditingPathId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, confirmLabel: 'Confirm', variant: 'danger' });
  const showConfirm = (opts) => setConfirmModal({ isOpen: true, confirmLabel: 'Confirm', variant: 'danger', ...opts });
  const closeConfirm = () => setConfirmModal((prev) => ({ ...prev, isOpen: false }));

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPaths, setTotalPaths] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');

  const [formState, setFormState] = useState(createDefaultFormState());

  const fetchData = async (pageNum = page, limitNum = limit) => {
    try {
      setIsLoading(true);
      const [pathsRes, typesRes, catsRes, subCatsRes, rolesRes, prioritiesRes] = await Promise.all([
        grievancePathApi.getPaths(pageNum, limitNum, sortField, sortOrder),
        masterApis.getTypes(),
        masterApis.getAllCategories(),
        masterApis.getAllSubCategories(),
        masterApis.getRoles(),
        masterApis.getTicketPriorities(),
      ]);

      const typesData = typesRes.data || typesRes.rows || typesRes || [];
      const catsData = catsRes.data || [];
      const prioritiesData = prioritiesRes.data || [];

      setPaths(pathsRes.data || []);
      setTotalPaths(pathsRes.total !== undefined ? pathsRes.total : (pathsRes.data || []).length);
      setTotalPages(pathsRes.totalPages !== undefined ? pathsRes.totalPages : 1);
      setTypes(typesData);
      setCategories(catsData);
      setSubCategories(subCatsRes.data || []);
      setRoles(rolesRes.data || []);
      setPriorities(prioritiesData);

      if (!editingPathId) {
        setFormState(createDefaultFormState(typesData, catsData, prioritiesData));
      }
    } catch (err) {
      console.error('Failed to load grievance paths:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page, limit);
  }, [page, limit, sortField, sortOrder]);

  useEffect(() => {
    if (!editingPathId) return;
    const path = paths.find((p) => p.id === editingPathId);
    if (!path) return;

    const nodes = (path.nodes || []).length
      ? path.nodes.map((node) => ({
          sequence: node.sequence,
          name: node.name || '',
          description: node.description || '',
          is_terminal: Boolean(node.is_terminal),
          role_ids: (node.role_ids?.length ? node.role_ids : node.roles?.map((r) => r.id) || ['']).map(String),
        }))
      : [emptyNode(0)];

    setFormState({
      name: path.name || '',
      type_id: path.type_id,
      assign_all_categories: !path.category_id,
      category_id: path.category_id || '',
      sub_category_id: path.sub_category_id || '',
      priority_id: path.priority_id,
      is_active: path.is_active !== false,
      nodes,
    });
  }, [editingPathId, paths]);

  const filteredCategories = categories.filter(
    (c) => Number(c.type_id) === Number(formState.type_id),
  );
  const filteredSubCats = subCategories.filter(
    (s) => Number(s.category_id) === Number(formState.category_id),
  );
  const activeRoles = roles.filter((role) => role.is_active !== false);


  const handleNodeChange = (index, field, value) => {
    setFormState((prev) => {
      const nodes = [...prev.nodes];
      nodes[index] = { ...nodes[index], [field]: value };
      return { ...prev, nodes };
    });
  };

  const handleNodeRoleChange = (nodeIndex, roleIndex, roleId) => {
    setFormState((prev) => {
      const nodes = [...prev.nodes];
      const roleIds = [...nodes[nodeIndex].role_ids];
      roleIds[roleIndex] = roleId;
      nodes[nodeIndex] = { ...nodes[nodeIndex], role_ids: roleIds };
      return { ...prev, nodes };
    });
  };

  const addNode = () => {
    setFormState((prev) => ({
      ...prev,
      nodes: [...prev.nodes, emptyNode(prev.nodes.length)],
    }));
  };

  const removeNode = (index) => {
    setFormState((prev) => {
      const nodes = prev.nodes
        .filter((_, i) => i !== index)
        .map((node, idx) => ({ ...node, sequence: idx }));
      return { ...prev, nodes: nodes.length ? nodes : [emptyNode(0)] };
    });
  };

  const addNodeRole = (nodeIndex) => {
    setFormState((prev) => {
      const nodes = [...prev.nodes];
      if (nodes[nodeIndex].role_ids.length >= MAX_NODE_ROLES) return prev;
      nodes[nodeIndex] = {
        ...nodes[nodeIndex],
        role_ids: [...nodes[nodeIndex].role_ids, ''],
      };
      return { ...prev, nodes };
    });
  };

  const removeNodeRole = (nodeIndex, roleIndex) => {
    setFormState((prev) => {
      const nodes = [...prev.nodes];
      const roleIds = nodes[nodeIndex].role_ids.filter((_, i) => i !== roleIndex);
      nodes[nodeIndex] = {
        ...nodes[nodeIndex],
        role_ids: roleIds.length ? roleIds : [''],
      };
      return { ...prev, nodes };
    });
  };

  const handleSavePath = async () => {
    try {
      if (!formState.type_id) {
        alert('Please select a grievance type.');
        return;
      }
      if (!formState.assign_all_categories && !formState.category_id) {
        alert('Please select a category or enable "All Categories".');
        return;
      }
      if (!formState.priority_id) {
        alert('Please select a default priority.');
        return;
      }

      const nodes = formState.nodes.map((node, index) => {
        const role_ids = [...new Set(
          node.role_ids.map(Number).filter((id) => !Number.isNaN(id) && id > 0),
        )];
        if (role_ids.length === 0) {
          throw new Error(`Stage ${index + 1} requires at least one role.`);
        }
        return {
          sequence: Number(node.sequence ?? index),
          name: node.name.trim(),
          description: node.description?.trim() || undefined,
          is_terminal: Boolean(node.is_terminal) || index === formState.nodes.length - 1,
          role_ids,
        };
      });

      const payload = {
        name: formState.name.trim(),
        type_id: Number(formState.type_id),
        category_id: formState.assign_all_categories ? null : Number(formState.category_id),
        sub_category_id: formState.sub_category_id ? Number(formState.sub_category_id) : null,
        priority_id: Number(formState.priority_id),
        is_active: formState.is_active,
        nodes,
      };

      if (editingPathId) {
        await grievancePathApi.updatePath(editingPathId, payload);
      } else {
        await grievancePathApi.createPath(payload);
      }

      setIsModalOpen(false);
      setEditingPathId(null);
      await fetchData(page, limit);
    } catch (err) {
      alert(err.message || 'Failed to save grievance path.');
    }
  };

  const handlePermanentDeletePath = (id) => {
    showConfirm({
      title: 'Permanently Delete Path',
      message: 'Are you sure you want to permanently delete this grievance path?',
      confirmLabel: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        await grievancePathApi.permanentDeletePath(id);
        await fetchData(page, limit);
        closeConfirm();
      },
    });
  };

  const handleTogglePathStatus = async (path) => {
    try {
      if (path.is_active) {
        await grievancePathApi.deletePath(path.id);
      } else {
        await grievancePathApi.updatePath(path.id, { is_active: true });
      }
      await fetchData(page, limit);
    } catch (error) {
      alert(error.message || 'Error toggling path status');
    }
  };

  if (isLoading) {
    return (
      <div className="ar-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div className="spinner-loader" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #2563eb', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', marginBottom: '16px' }}></div>
        <p style={{ color: '#64748b', fontSize: '16px', fontWeight: '500' }}>Loading grievance paths...</p>
      </div>
    );
  }

  return (
    <div className="ar-page">
      <div className="ar-header">
        <div>
          <h1 className="ar-title">Grievance Paths</h1>
          <p className="ar-subtitle">Define multi-stage routing paths with roles at each node.</p>
        </div>
        <div className="ar-header-actions">
          <button className="ar-btn ar-btn-primary" type="button" onClick={() => {
            setEditingPathId(null);
            setFormState(createDefaultFormState(types, categories, priorities));
            setIsModalOpen(true);
          }}>
            <i className="fa-solid fa-plus" />
            Add New Path
          </button>
        </div>
      </div>

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingPathId ? 'Edit Grievance Path' : 'Add Grievance Path'}
          subtitle="Define how grievances match and move through workflow stages."
          maxWidth="820px"
          className="gp-modal"
        >
          <div className="gp-modal-scroll">
            <section className="gp-section">
              <div className="gp-section-head">
                <div className="gp-section-icon">
                  <i className="fa-solid fa-filter" />
                </div>
                <div>
                  <h4 className="gp-section-title">Match criteria</h4>
                  <p className="gp-section-desc">Which grievances use this path when submitted.</p>
                </div>
              </div>

              <div className="gp-form-grid">
                <div className="gp-field gp-field-span-2">
                  <label htmlFor="gp-path-name">Path name</label>
                  <input
                    id="gp-path-name"
                    type="text"
                    value={formState.name}
                    onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Optional — defaults to Untitled Path"
                  />
                </div>

                <div className="gp-field">
                  <label htmlFor="gp-type">Grievance type <span className="ar-required">*</span></label>
                  <select
                    id="gp-type"
                    value={formState.type_id}
                    onChange={(e) => setFormState((prev) => ({
                      ...prev,
                      type_id: e.target.value,
                      category_id: '',
                      sub_category_id: '',
                    }))}
                  >
                    <option value="">Select type</option>
                    {types.map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>

                <div className="gp-field">
                  <label htmlFor="gp-priority">Default priority <span className="ar-required">*</span></label>
                  <select
                    id="gp-priority"
                    value={formState.priority_id}
                    onChange={(e) => setFormState((prev) => ({ ...prev, priority_id: e.target.value }))}
                  >
                    {priorities.map((priority) => (
                      <option key={priority.id} value={priority.id}>{priority.name}</option>
                    ))}
                  </select>
                </div>

                <label className="gp-checkbox-card" htmlFor="gp-all-categories">
                  <input
                    id="gp-all-categories"
                    type="checkbox"
                    checked={formState.assign_all_categories}
                    onChange={(e) => setFormState((prev) => ({
                      ...prev,
                      assign_all_categories: e.target.checked,
                      category_id: e.target.checked ? '' : (filteredCategories[0]?.id || ''),
                      sub_category_id: '',
                    }))}
                  />
                  <span>Match all categories in this type</span>
                </label>

                {!formState.assign_all_categories && (
                  <>
                    <div className="gp-field">
                      <label htmlFor="gp-category">Category <span className="ar-required">*</span></label>
                      <select
                        id="gp-category"
                        value={formState.category_id}
                        onChange={(e) => setFormState((prev) => ({
                          ...prev,
                          category_id: e.target.value,
                          sub_category_id: '',
                        }))}
                      >
                        <option value="">Select category</option>
                        {filteredCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="gp-field">
                      <label htmlFor="gp-subcategory">Sub-category</label>
                      <select
                        id="gp-subcategory"
                        value={formState.sub_category_id}
                        onChange={(e) => setFormState((prev) => ({ ...prev, sub_category_id: e.target.value }))}
                        disabled={!formState.category_id}
                      >
                        <option value="">All sub-categories</option>
                        {filteredSubCats.map((sub) => (
                          <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="gp-section">
              <div className="gp-section-head">
                <div className="gp-section-icon">
                  <i className="fa-solid fa-route" />
                </div>
                <div>
                  <h4 className="gp-section-title">Workflow nodes</h4>
                  <p className="gp-section-desc">
                    Stages run in order. Assign up to {MAX_NODE_ROLES} roles per stage.
                  </p>
                </div>
              </div>

              <div className="gp-nodes-list">
                {formState.nodes.map((node, nodeIndex) => {
                  const isLast = nodeIndex === formState.nodes.length - 1;
                  return (
                    <div key={`node-${nodeIndex}`} className="gp-node-card">
                      <div className="gp-node-card-head">
                        <div className="gp-node-step">
                          <span className="gp-node-badge">{nodeIndex + 1}</span>
                          <input
                            type="text"
                            className="gp-node-name-input"
                            value={node.name}
                            onChange={(e) => handleNodeChange(nodeIndex, 'name', e.target.value)}
                            placeholder={`Optional — defaults to Stage ${nodeIndex + 1}`}
                            aria-label={`Node ${nodeIndex + 1} name`}
                          />
                        </div>
                        {formState.nodes.length > 1 && (
                          <button
                            type="button"
                            className="gp-node-delete"
                            onClick={() => removeNode(nodeIndex)}
                            aria-label={`Remove stage ${nodeIndex + 1}`}
                          >
                            <i className="fa-solid fa-trash" />
                          </button>
                        )}
                      </div>

                      <div className="gp-node-body">
                        <span className="gp-node-roles-label">Assigned roles</span>
                        {node.role_ids.map((roleId, roleIndex) => (
                          <div key={`node-${nodeIndex}-role-${roleIndex}`} className="gp-role-row">
                            <select
                              value={roleId}
                              onChange={(e) => handleNodeRoleChange(nodeIndex, roleIndex, e.target.value)}
                              aria-label={`Stage ${nodeIndex + 1} role ${roleIndex + 1}`}
                            >
                              <option value="">Select role</option>
                              {activeRoles.map((role) => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="gp-role-remove-btn"
                              onClick={() => removeNodeRole(nodeIndex, roleIndex)}
                              disabled={node.role_ids.length <= 1}
                              aria-label="Remove role"
                            >
                              <i className="fa-solid fa-xmark" />
                            </button>
                          </div>
                        ))}
                        <div className="gp-node-actions">
                          {node.role_ids.length < MAX_NODE_ROLES && (
                            <button type="button" className="gp-text-btn" onClick={() => addNodeRole(nodeIndex)}>
                              <i className="fa-solid fa-plus" /> Add role
                            </button>
                          )}
                        </div>
                        {isLast && (
                          <p className="gp-terminal-hint">Last stage is terminal — grievances cannot be forwarded beyond it.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button type="button" className="gp-text-btn gp-text-btn-primary gp-add-stage-btn" onClick={addNode}>
                <i className="fa-solid fa-plus" /> Add stage
              </button>
            </section>
          </div>

          <div className="gp-modal-footer">
            <button className="ar-btn ar-btn-outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button className="ar-btn ar-btn-primary" type="button" onClick={handleSavePath}>
              {editingPathId ? 'Save changes' : 'Create path'}
            </button>
          </div>
        </Modal>
      )}

      <div className="ar-table-panel">
        <div className="ar-table-header">
          <h3>Grievance Paths List</h3>
        </div>
        <div className="ar-table-container">
          <table className="ar-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Type</th>
                <th>Category</th>
                <th>Nodes</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paths.map((path, index) => (
                <tr key={path.id}>
                  <td>{(page - 1) * limit + index + 1}</td>
                  <td>{path.name}</td>
                  <td>{path.type?.name || '—'}</td>
                  <td>{path.category?.name || <span className="ar-all-pill">All Categories</span>}</td>
                  <td>
                    {(path.nodes || []).map((node) => node.name).join(' → ') || `${path.node_count || 0} nodes`}
                  </td>
                  <td>{path.priority?.name || '—'}</td>
                  <td>
                    <div className="cm-status-toggle-wrap" onClick={() => handleTogglePathStatus(path)}>
                      <span className={`ar-status-pill ${path.is_active ? 'ar-status-active' : 'ar-status-inactive'}`}>
                        {path.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="ar-actions-cell">
                      <button
                        className="ar-action-btn edit"
                        onClick={() => {
                          setEditingPathId(path.id);
                          setIsModalOpen(true);
                        }}
                      >
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      <button className="ar-action-btn delete" onClick={() => handlePermanentDeletePath(path.id)}>
                        <i className="fa-regular fa-trash-can"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paths.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No grievance paths defined. Click &apos;Add New Path&apos; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="cm-pagination" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
          <div className="cm-page-info">
            Showing {totalPaths === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, totalPaths)} of {totalPaths} paths
          </div>
          <div className="cm-page-controls">
            <button className="cm-page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <PaginationPageNumbers page={page} totalPages={totalPages} onPageChange={setPage} buttonClassName="cm-page-btn" />
            <button className="cm-page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
      />
    </div>
  );
};

export default GrievancePaths;
