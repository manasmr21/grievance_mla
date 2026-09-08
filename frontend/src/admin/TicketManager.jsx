import React, { useState, useEffect, useMemo } from 'react';
import '../styles/admin/AdminShared.css'; // Reusing base admin manager styles
import '../styles/admin/TicketManager.css'; // Importing custom tabs and badges styling
import { masterApis } from '../services/api/api';
import ConfirmModal from '../components/UI/ConfirmModal';
import DebouncedSearchInput from '../components/UI/DebouncedSearchInput';
import PaginationPageNumbers from '../components/UI/PaginationPageNumbers';
import useDebouncedSearchFetch, { isAbortError } from '../hooks/useDebouncedSearchFetch';

const TicketManager = () => {
  const [activeTab, setActiveTab] = useState('status'); // 'status' or 'priority'

  // Ticket Status State
  const [statuses, setStatuses] = useState([]);
  const [statusPage, setStatusPage] = useState(1);
  const [statusLimit] = useState(10);
  const [totalStatuses, setTotalStatuses] = useState(0);
  const [statusTotalPages, setStatusTotalPages] = useState(1);
  const [isAddStatusOpen, setIsAddStatusOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);

  // Ticket Priority State
  const [priorities, setPriorities] = useState([]);
  const [priorityPage, setPriorityPage] = useState(1);
  const [priorityLimit] = useState(10);
  const [totalPriorities, setTotalPriorities] = useState(0);
  const [priorityTotalPages, setPriorityTotalPages] = useState(1);
  const [isAddPriorityOpen, setIsAddPriorityOpen] = useState(false);
  const [editingPriority, setEditingPriority] = useState(null);

  // Loading indicator
  const [loading, setLoading] = useState(false);

  const {
    debouncedSearch: debouncedStatusSearch,
    handleSearchChange: handleStatusSearchChange,
    abortSearch: abortStatusSearch,
    createFetchController: createStatusController,
  } = useDebouncedSearchFetch({ onPageReset: () => setStatusPage(1) });

  const {
    debouncedSearch: debouncedPrioritySearch,
    handleSearchChange: handlePrioritySearchChange,
    abortSearch: abortPrioritySearch,
    createFetchController: createPriorityController,
  } = useDebouncedSearchFetch({ onPageReset: () => setPriorityPage(1) });

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, confirmLabel: 'Confirm', variant: 'danger' });
  const showConfirm = (opts) => setConfirmModal({ isOpen: true, confirmLabel: 'Confirm', variant: 'danger', ...opts });
  const closeConfirm = () => setConfirmModal((prev) => ({ ...prev, isOpen: false }));

  // Sort states
  const [statusSortField, setStatusSortField] = useState('name');
  const [statusSortOrder, setStatusSortOrder] = useState('ASC');
  const [prioritySortField, setPrioritySortField] = useState('name');
  const [prioritySortOrder, setPriorityLimitOrder] = useState('ASC');

  const handleStatusSort = (field) => {
    if (statusSortField === field) {
      setStatusSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setStatusSortField(field);
      setStatusSortOrder('ASC');
    }
  };

  const handlePrioritySort = (field) => {
    if (prioritySortField === field) {
      setPriorityLimitOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setPrioritySortField(field);
      setPriorityLimitOrder('ASC');
    }
  };

  const SortIcon = ({ field, activeField, activeOrder }) => {
    const isActive = activeField === field;
    return (
      <span className="sort-arrows-icon">
        {isActive ? (
          activeOrder === 'ASC' ? (
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

  // Fetch Statuses
  const fetchStatuses = async (pageNum = statusPage) => {
    const controller = createStatusController();
    try {
      setLoading(true);
      const res = await masterApis.getTicketStatus(pageNum, statusLimit, debouncedStatusSearch, { signal: controller.signal });
      const statusData = res?.data || res || [];
      setStatuses(Array.isArray(statusData) ? statusData : []);
      setTotalStatuses(res?.total !== undefined ? res.total : statusData.length);
      setStatusTotalPages(res?.totalPages !== undefined ? res.totalPages : 1);
    } catch (err) {
      if (isAbortError(err)) return;
      console.error("Error fetching ticket statuses:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Priorities
  const fetchPriorities = async (pageNum = priorityPage) => {
    const controller = createPriorityController();
    try {
      setLoading(true);
      const res = await masterApis.getTicketPriorities(pageNum, priorityLimit, debouncedPrioritySearch, { signal: controller.signal });
      const priorityData = res?.data || res || [];
      setPriorities(Array.isArray(priorityData) ? priorityData : []);
      setTotalPriorities(res?.total !== undefined ? res.total : priorityData.length);
      setPriorityTotalPages(res?.totalPages !== undefined ? res.totalPages : 1);
    } catch (err) {
      if (isAbortError(err)) return;
      console.error("Error fetching ticket priorities:", err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetches on page, tab, or debounced search change
  useEffect(() => {
    if (activeTab === 'status') fetchStatuses(statusPage);
  }, [activeTab, statusPage, debouncedStatusSearch]);

  useEffect(() => {
    if (activeTab === 'priority') fetchPriorities(priorityPage);
  }, [activeTab, priorityPage, debouncedPrioritySearch]);

  // Permanent delete status
  const handleDeleteStatus = (id, name) => {
    showConfirm({
      title: 'Permanently Delete Status',
      message: `Are you sure you want to PERMANENTLY delete the status "${name}"? This action cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await masterApis.permanentDeleteTicketStatus(id);
          alert(res.message || 'Status permanently deleted successfully');
          fetchStatuses(statusPage);
        } catch (err) {
          alert(err.message || 'Error permanently deleting status');
        }
        closeConfirm();
      },
    });
  };

  const handleToggleStatusActive = async (status) => {
    try {
      if (status.is_active) {
        await masterApis.deleteTicketStatus(status.id);
      } else {
        await masterApis.updateTicketStatus(status.id, { is_active: true });
      }
      setStatuses((prev) =>
        prev.map((s) => (s.id === status.id ? { ...s, is_active: !s.is_active } : s))
      );
    } catch (error) {
      alert(error.message || 'Error toggling status');
      fetchStatuses(statusPage);
    }
  };

  // Permanent delete priority
  const handleDeletePriority = (id, name) => {
    showConfirm({
      title: 'Permanently Delete Priority',
      message: `Are you sure you want to PERMANENTLY delete the priority "${name}"? This action cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await masterApis.permanentDeleteTicketPriority(id);
          alert(res.message || 'Priority permanently deleted successfully');
          fetchPriorities(priorityPage);
        } catch (err) {
          alert(err.message || 'Error permanently deleting priority');
        }
        closeConfirm();
      },
    });
  };

  const handleTogglePriorityActive = async (prio) => {
    try {
      if (prio.is_active) {
        await masterApis.deleteTicketPriority(prio.id);
      } else {
        await masterApis.updateTicketPriority(prio.id, { is_active: true });
      }
      setPriorities((prev) =>
        prev.map((p) => (p.id === prio.id ? { ...p, is_active: !p.is_active } : p))
      );
    } catch (error) {
      alert(error.message || 'Error toggling priority');
      fetchPriorities(priorityPage);
    }
  };

  // Client-side sort (search is server-side; sort stays local for simplicity)
  const sortedStatuses = useMemo(() => {
    const result = [...statuses];
    result.sort((a, b) => {
      let aVal = a[statusSortField] ?? '';
      let bVal = b[statusSortField] ?? '';
      if (typeof aVal === 'boolean') aVal = aVal ? 1 : 0;
      if (typeof bVal === 'boolean') bVal = bVal ? 1 : 0;
      if (aVal < bVal) return statusSortOrder === 'ASC' ? -1 : 1;
      if (aVal > bVal) return statusSortOrder === 'ASC' ? 1 : -1;
      return 0;
    });
    return result;
  }, [statuses, statusSortField, statusSortOrder]);

  const sortedPriorities = useMemo(() => {
    const result = [...priorities];
    result.sort((a, b) => {
      let aVal = a[prioritySortField] ?? '';
      let bVal = b[prioritySortField] ?? '';
      if (typeof aVal === 'boolean') aVal = aVal ? 1 : 0;
      if (typeof bVal === 'boolean') bVal = bVal ? 1 : 0;
      if (aVal < bVal) return prioritySortOrder === 'ASC' ? -1 : 1;
      if (aVal > bVal) return prioritySortOrder === 'ASC' ? 1 : -1;
      return 0;
    });
    return result;
  }, [priorities, prioritySortField, prioritySortOrder]);

  // Priority Badge class builder
  const getPriorityBadgeClass = (code) => {
    const codeUpper = String(code || '').toUpperCase();
    if (codeUpper === 'EMERGENCY') return 'priority-badge emergency';
    if (codeUpper === 'URGENT') return 'priority-badge urgent';
    if (codeUpper === 'ROUTINE') return 'priority-badge routine';
    return 'priority-badge default';
  };

  return (
    <div className="cm-page">
      <div className="cm-hero">
        <div className="cm-hero-text">
          <h1 className="cm-title">Ticket Settings Management</h1>
          <p className="cm-subtitle">Configure the ticket status values and priority SLAs for incoming grievances.</p>
        </div>
        {activeTab === 'status' ? (
          <button className="cm-btn cm-btn-primary" type="button" onClick={() => setIsAddStatusOpen(true)}>
            <i className="fa-solid fa-plus" />
            Add Status
          </button>
        ) : (
          <button className="cm-btn cm-btn-primary" type="button" onClick={() => setIsAddPriorityOpen(true)}>
            <i className="fa-solid fa-plus" />
            Add Priority
          </button>
        )}
      </div>

      <div className="tm-tabs">
        <button 
          className={`tm-tab ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          <i className="fa-solid fa-circle-dot"></i>
          Ticket Statuses
        </button>
        <button 
          className={`tm-tab ${activeTab === 'priority' ? 'active' : ''}`}
          onClick={() => setActiveTab('priority')}
        >
          <i className="fa-solid fa-triangle-exclamation"></i>
          Ticket Priorities
        </button>
      </div>

      {activeTab === 'status' ? (
        <div className="cm-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="cm-main-panel">
            <div className="cm-main-toolbar">
              <DebouncedSearchInput
                placeholder="Search statuses..."
                onDebouncedChange={handleStatusSearchChange}
                onTyping={abortStatusSearch}
              />
            </div>

            <div className="cm-table-container">
              <table className="cm-table">
                <thead>
                <tr>
                  <th>
                    <button type="button" className={`table-header-sort-btn ${statusSortField === 'name' ? 'active' : ''}`} onClick={() => handleStatusSort('name')}>
                      <span>Name</span>
                      <SortIcon field="name" activeField={statusSortField} activeOrder={statusSortOrder} />
                    </button>
                  </th>
                  <th>
                    <button type="button" className={`table-header-sort-btn ${statusSortField === 'code' ? 'active' : ''}`} onClick={() => handleStatusSort('code')}>
                      <span>Code</span>
                      <SortIcon field="code" activeField={statusSortField} activeOrder={statusSortOrder} />
                    </button>
                  </th>
                  <th>
                    <button type="button" className={`table-header-sort-btn ${statusSortField === 'is_active' ? 'active' : ''}`} onClick={() => handleStatusSort('is_active')}>
                      <span>Status</span>
                      <SortIcon field="is_active" activeField={statusSortField} activeOrder={statusSortOrder} />
                    </button>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="cm-empty-state">Loading ticket statuses...</td>
                    </tr>
                  ) : sortedStatuses.length > 0 ? (
                    sortedStatuses.map((status) => (
                      <tr key={status.id}>
                        <td data-label="Status Name">
                          <div className="cm-subcat-name-cell">
                            <div className="cm-subcat-icon tone-blue">
                              <i className="fa-solid fa-circle-notch"></i>
                            </div>
                            <span>{status.name}</span>
                          </div>
                        </td>
                        <td data-label="Code">
                          <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                            {status.code}
                          </code>
                        </td>
                        <td data-label="Status">
                          <div className="cm-status-toggle-wrap" onClick={() => handleToggleStatusActive(status)} title={status.is_active ? 'Click to deactivate' : 'Click to activate'}>
                            <div className={`cm-toggle-switch ${status.is_active ? 'on' : 'off'}`}>
                              <div className="cm-toggle-knob" />
                            </div>
                            <span className={`cm-status-pill ${status.is_active ? 'active' : 'inactive'}`}>
                              {status.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td data-label="Actions">
                          <div className="cm-actions-group">
                            <button className="cm-action-btn edit-btn" aria-label="Edit" onClick={() => setEditingStatus(status)}>
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            <button className="cm-action-btn delete-btn" aria-label="Permanent Delete" onClick={() => handleDeleteStatus(status.id, status.name)} title="Permanent Delete">
                              <i className="fa-regular fa-trash-can"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="cm-empty-state">No ticket statuses found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Status Pagination */}
            {statusTotalPages > 1 && (
              <div className="cm-pagination">
                <div className="cm-page-info">
                  Showing Page {statusPage} of {statusTotalPages} ({totalStatuses} items total)
                </div>
                <div className="cm-page-controls">
                  <button
                    className="cm-page-btn"
                    onClick={() => setStatusPage((p) => Math.max(1, p - 1))}
                    disabled={statusPage <= 1}
                    aria-label="Previous page"
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>
                  <PaginationPageNumbers
                    page={statusPage}
                    totalPages={statusTotalPages}
                    onPageChange={setStatusPage}
                    buttonClassName="cm-page-btn"
                  />
                  <button
                    className="cm-page-btn"
                    onClick={() => setStatusPage((p) => Math.min(statusTotalPages, p + 1))}
                    disabled={statusPage >= statusTotalPages}
                    aria-label="Next page"
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="cm-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="cm-main-panel">
            <div className="cm-main-toolbar">
              <DebouncedSearchInput
                placeholder="Search priorities..."
                onDebouncedChange={handlePrioritySearchChange}
                onTyping={abortPrioritySearch}
              />
            </div>

            <div className="cm-table-container">
              <table className="cm-table">
                <thead>
                <tr>
                  <th>
                    <button type="button" className={`table-header-sort-btn ${prioritySortField === 'name' ? 'active' : ''}`} onClick={() => handlePrioritySort('name')}>
                      <span>Name</span>
                      <SortIcon field="name" activeField={prioritySortField} activeOrder={prioritySortOrder} />
                    </button>
                  </th>
                  <th>
                    <button type="button" className={`table-header-sort-btn ${prioritySortField === 'code' ? 'active' : ''}`} onClick={() => handlePrioritySort('code')}>
                      <span>Code</span>
                      <SortIcon field="code" activeField={prioritySortField} activeOrder={prioritySortOrder} />
                    </button>
                  </th>
                  <th>
                    <button type="button" className={`table-header-sort-btn ${prioritySortField === 'resolution_hours' ? 'active' : ''}`} onClick={() => handlePrioritySort('resolution_hours')}>
                      <span>SLA Resolution (Hours)</span>
                      <SortIcon field="resolution_hours" activeField={prioritySortField} activeOrder={prioritySortOrder} />
                    </button>
                  </th>
                  <th>
                    <button type="button" className={`table-header-sort-btn ${prioritySortField === 'is_active' ? 'active' : ''}`} onClick={() => handlePrioritySort('is_active')}>
                      <span>Status</span>
                      <SortIcon field="is_active" activeField={prioritySortField} activeOrder={prioritySortOrder} />
                    </button>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="cm-empty-state">Loading ticket priorities...</td>
                    </tr>
                  ) : sortedPriorities.length > 0 ? (
                    sortedPriorities.map((prio) => (
                      <tr key={prio.id}>
                        <td data-label="Priority Name">
                          <div className="cm-subcat-name-cell">
                            <span className={getPriorityBadgeClass(prio.code)}>{prio.name}</span>
                          </div>
                        </td>
                        <td data-label="Code">
                          <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                            {prio.code}
                          </code>
                        </td>
                        <td data-label="SLA Hours">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fa-regular fa-clock" style={{ color: '#64748b' }}></i>
                            <strong>{prio.resolution_hours ? `${prio.resolution_hours} Hours` : 'N/A'}</strong>
                          </div>
                        </td>
                        <td data-label="Status">
                          <div className="cm-status-toggle-wrap" onClick={() => handleTogglePriorityActive(prio)} title={prio.is_active ? 'Click to deactivate' : 'Click to activate'}>
                            <div className={`cm-toggle-switch ${prio.is_active ? 'on' : 'off'}`}>
                              <div className="cm-toggle-knob" />
                            </div>
                            <span className={`cm-status-pill ${prio.is_active ? 'active' : 'inactive'}`}>
                              {prio.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td data-label="Actions">
                          <div className="cm-actions-group">
                            <button className="cm-action-btn edit-btn" aria-label="Edit" onClick={() => setEditingPriority(prio)}>
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            <button className="cm-action-btn delete-btn" aria-label="Permanent Delete" onClick={() => handleDeletePriority(prio.id, prio.name)} title="Permanent Delete">
                              <i className="fa-regular fa-trash-can"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="cm-empty-state">No ticket priorities found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Priority Pagination */}
            {priorityTotalPages > 1 && (
              <div className="cm-pagination">
                <div className="cm-page-info">
                  Showing Page {priorityPage} of {priorityTotalPages} ({totalPriorities} items total)
                </div>
                <div className="cm-page-controls">
                  <button
                    className="cm-page-btn"
                    onClick={() => setPriorityPage((p) => Math.max(1, p - 1))}
                    disabled={priorityPage <= 1}
                    aria-label="Previous page"
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>
                  <PaginationPageNumbers
                    page={priorityPage}
                    totalPages={priorityTotalPages}
                    onPageChange={setPriorityPage}
                    buttonClassName="cm-page-btn"
                  />
                  <button
                    className="cm-page-btn"
                    onClick={() => setPriorityPage((p) => Math.min(priorityTotalPages, p + 1))}
                    disabled={priorityPage >= priorityTotalPages}
                    aria-label="Next page"
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Status Modal */}
      <AddStatusModal
        isOpen={isAddStatusOpen}
        onClose={() => setIsAddStatusOpen(false)}
        onSuccess={() => fetchStatuses(statusPage)}
      />

      {/* Edit Status Modal */}
      <EditStatusModal
        editingStatus={editingStatus}
        setEditingStatus={setEditingStatus}
        onSuccess={() => fetchStatuses(statusPage)}
      />

      {/* Add Priority Modal */}
      <AddPriorityModal
        isOpen={isAddPriorityOpen}
        onClose={() => setIsAddPriorityOpen(false)}
        onSuccess={() => fetchPriorities(priorityPage)}
      />

      {/* Edit Priority Modal */}
      <EditPriorityModal
        editingPriority={editingPriority}
        setEditingPriority={setEditingPriority}
        onSuccess={() => fetchPriorities(priorityPage)}
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

export default TicketManager;

/* Subcomponents for Status Modals */
function AddStatusModal({ isOpen, onClose, onSuccess }) {
  if (!isOpen) return null;
  const [formData, setFormData] = useState({ name: "", code: "", is_active: true });

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      alert("Please fill in all required fields.");
      return;
    }
    try {
      const response = await masterApis.createTicketStatus({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        is_active: formData.is_active
      });
      alert(response.message || "Status created successfully");
      onSuccess();
      onClose();
      setFormData({ name: "", code: "", is_active: true });
    } catch (error) {
      alert(error.message || "Error creating status");
    }
  };

  return (
    <div className="cm-modal-overlay">
      <div className="cm-modal">
        <div className="cm-modal-header">
          <div>
            <h3 className="cm-modal-title">Add Ticket Status</h3>
            <p className="cm-modal-subtitle">Define a new status option for grievance workflows.</p>
          </div>
          <button className="cm-modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="cm-modal-body">
          <div className="cm-form-group">
            <label>Status Name <span className="cm-required">*</span></label>
            <input
              type="text"
              placeholder="e.g. In Progress, Investigation"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="cm-form-group">
            <label>Status Code <span className="cm-required">*</span></label>
            <input
              type="text"
              className='uppercase'
              placeholder="e.g. IN_PROGRESS, INVESTIGATING"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            />
          </div>

        </div>

        <div className="cm-modal-footer">
          <button className="cm-btn cm-btn-cancel" type="button" onClick={onClose}>Cancel</button>
          <button className="cm-btn cm-btn-primary" type="button" onClick={handleAdd}>Add Status</button>
        </div>
      </div>
    </div>
  );
}

function EditStatusModal({ editingStatus, setEditingStatus, onSuccess }) {
  if (!editingStatus) return null;

  const handleEdit = async () => {
    if (!editingStatus.name.trim() || !editingStatus.code.trim()) {
      alert("Name and Code are required.");
      return;
    }
    try {
      const response = await masterApis.updateTicketStatus(editingStatus.id, {
        name: editingStatus.name.trim(),
        code: editingStatus.code.trim().toUpperCase(),
        is_active: editingStatus.is_active
      });
      alert(response.message || "Status updated successfully");
      setEditingStatus(null);
      if (onSuccess) onSuccess();
    } catch (error) {
      alert(error.message || "Error updating status");
    }
  };

  return (
    <div className="cm-modal-overlay">
      <div className="cm-modal">
        <div className="cm-modal-header">
          <div>
            <h3 className="cm-modal-title">Edit Ticket Status</h3>
            <p className="cm-modal-subtitle">Modify the details of this status configuration.</p>
          </div>
          <button className="cm-modal-close" onClick={() => setEditingStatus(null)}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="cm-modal-body">
          <div className="cm-form-group">
            <label>Status Name <span className="cm-required">*</span></label>
            <input
              type="text"
              placeholder="Enter status name"
              value={editingStatus.name}
              onChange={(e) => setEditingStatus({ ...editingStatus, name: e.target.value })}
            />
          </div>

          <div className="cm-form-group">
            <label>Status Code <span className="cm-required">*</span></label>
            <input
              type="text"
              className="uppercase"
              placeholder="Enter status code"
              value={editingStatus.code}
              onChange={(e) => setEditingStatus({ ...editingStatus, code: e.target.value.toUpperCase() })}
            />
          </div>

        </div>

        <div className="cm-modal-footer">
          <button className="cm-btn cm-btn-cancel" type="button" onClick={() => setEditingStatus(null)}>Cancel</button>
          <button className="cm-btn cm-btn-primary" type="button" onClick={handleEdit}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

/* Subcomponents for Priority Modals */
function AddPriorityModal({ isOpen, onClose, onSuccess }) {
  if (!isOpen) return null;
  const [formData, setFormData] = useState({ name: "", code: "", resolution_hours: "", is_active: true });

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      alert("Please fill in all required fields.");
      return;
    }
    
    // Parse resolution hours
    const hours = formData.resolution_hours ? parseFloat(formData.resolution_hours) : null;
    if (hours !== null && (isNaN(hours) || hours <= 0)) {
      alert("SLA Resolution hours must be a positive number.");
      return;
    }

    try {
      const response = await masterApis.createTicketPriority({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        resolution_hours: hours,
        is_active: formData.is_active
      });
      alert(response.message || "Priority created successfully");
      onSuccess();
      onClose();
      setFormData({ name: "", code: "", resolution_hours: "", is_active: true });
    } catch (error) {
      alert(error.message || "Error creating priority");
    }
  };

  return (
    <div className="cm-modal-overlay">
      <div className="cm-modal">
        <div className="cm-modal-header">
          <div>
            <h3 className="cm-modal-title">Add Ticket Priority</h3>
            <p className="cm-modal-subtitle">Define a new severity priority with resolution SLA time window.</p>
          </div>
          <button className="cm-modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="cm-modal-body">
          <div className="cm-form-group">
            <label>Priority Name <span className="cm-required">*</span></label>
            <input
              type="text"
              placeholder="e.g. Critical, Low, Intermediate"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="cm-form-group">
            <label>Priority Code <span className="cm-required">*</span></label>
            <input
              type="text"
              className='uppercase'
              placeholder="e.g. CRITICAL, LOW"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="cm-form-group">
            <label>SLA Resolution Hours</label>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 24 for 1 day, 72 for 3 days"
              value={formData.resolution_hours}
              onChange={(e) => setFormData({ ...formData, resolution_hours: e.target.value })}
            />
          </div>

        </div>

        <div className="cm-modal-footer">
          <button className="cm-btn cm-btn-cancel" type="button" onClick={onClose}>Cancel</button>
          <button className="cm-btn cm-btn-primary" type="button" onClick={handleAdd}>Add Priority</button>
        </div>
      </div>
    </div>
  );
}

function EditPriorityModal({ editingPriority, setEditingPriority, onSuccess }) {
  if (!editingPriority) return null;

  const handleEdit = async () => {
    if (!editingPriority.name.trim() || !editingPriority.code.trim()) {
      alert("Name and Code are required.");
      return;
    }

    const hours = editingPriority.resolution_hours ? parseFloat(editingPriority.resolution_hours) : null;
    if (hours !== null && (isNaN(hours) || hours <= 0)) {
      alert("SLA Resolution hours must be a positive number.");
      return;
    }

    try {
      const response = await masterApis.updateTicketPriority(editingPriority.id, {
        name: editingPriority.name.trim(),
        code: editingPriority.code.trim().toUpperCase(),
        resolution_hours: hours,
        is_active: editingPriority.is_active
      });
      alert(response.message || "Priority updated successfully");
      setEditingPriority(null);
      if (onSuccess) onSuccess();
    } catch (error) {
      alert(error.message || "Error updating priority");
    }
  };

  return (
    <div className="cm-modal-overlay">
      <div className="cm-modal">
        <div className="cm-modal-header">
          <div>
            <h3 className="cm-modal-title">Edit Ticket Priority</h3>
            <p className="cm-modal-subtitle">Modify severity label, code, and resolution SLA settings.</p>
          </div>
          <button className="cm-modal-close" onClick={() => setEditingPriority(null)}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="cm-modal-body">
          <div className="cm-form-group">
            <label>Priority Name <span className="cm-required">*</span></label>
            <input
              type="text"
              placeholder="Enter priority name"
              value={editingPriority.name}
              onChange={(e) => setEditingPriority({ ...editingPriority, name: e.target.value })}
            />
          </div>

          <div className="cm-form-group">
            <label>Priority Code <span className="cm-required">*</span></label>
            <input
              type="text"
              className="uppercase"
              placeholder="Enter priority code"
              value={editingPriority.code}
              onChange={(e) => setEditingPriority({ ...editingPriority, code: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="cm-form-group">
            <label>SLA Resolution Hours</label>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 24, 72"
              value={editingPriority.resolution_hours || ''}
              onChange={(e) => setEditingPriority({ ...editingPriority, resolution_hours: e.target.value })}
            />
          </div>

        </div>

        <div className="cm-modal-footer">
          <button className="cm-btn cm-btn-cancel" type="button" onClick={() => setEditingPriority(null)}>Cancel</button>
          <button className="cm-btn cm-btn-primary" type="button" onClick={handleEdit}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
