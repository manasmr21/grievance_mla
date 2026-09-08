import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { grievanceApi, masterApis } from '../services/api/api';
import '../styles/hod/GrievanceDetail.css';
import { useAuth } from '../hooks/useAuth';
import useAsyncEffect from '../hooks/useAsyncEffect';
import { useConfirmModal } from '../hooks/useConfirmModal';
import { getStatusTone, getPriorityTone } from '../utils/grievanceBadges';
import { resolveAttachmentUrl, isImageAttachment } from '../utils/attachmentUrl';
import SearchableSelect from '../components/UI/SearchableSelect';
import '../styles/admin/AdminShared.css';

const GrievanceDetail = ({ backPath = '/staff/assigned', backLabel = 'Back to My Assigned' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role, activeRole } = useAuth();
  const isAdmin = String(role || '').toLowerCase() === 'admin';
  const { showConfirm, ConfirmDialog } = useConfirmModal();

  const [grievance, setGrievance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const [statusList, setStatusList] = useState([]);
  const [priorityList, setPriorityList] = useState([]);
  const [typeList, setTypeList] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [subCategoryList, setSubCategoryList] = useState([]);
  const [subCategoriesLoading, setSubCategoriesLoading] = useState(false);
  const [departmentList, setDepartmentList] = useState([]);
  const [forwardDepartmentId, setForwardDepartmentId] = useState('');
  const [forwardEmployeeId, setForwardEmployeeId] = useState('');
  const [forwardEmployeeOptions, setForwardEmployeeOptions] = useState([]);
  const [forwardEmployeesLoading, setForwardEmployeesLoading] = useState(false);

  const [updateFormData, setUpdateFormData] = useState({
    status_id: '',
    priority_id: '',
    type_id: '',
    category_id: '',
    sub_category_id: '',
  });

  const fetchGrievanceDetails = useCallback(async (isCancelled = () => false) => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await grievanceApi.getGrievanceById(id);
      if (isCancelled()) return;
      if (res && res.success && res.data) {
        setGrievance(res.data);
        setActionError(null);
        setUpdateFormData({
          status_id: res.data.status_id || '',
          priority_id: res.data.priority_id || '',
          type_id: res.data.category?.type?.id || res.data.category?.type_id || '',
          category_id: res.data.category_id || '',
          sub_category_id: res.data.sub_category_id || '',
        });
      } else {
        setError(res?.message || 'Failed to load grievance details.');
      }
    } catch (err) {
      if (isCancelled()) return;
      console.error('Error fetching grievance:', err);
      setError(err.message || 'Error loading grievance.');
    } finally {
      if (!isCancelled()) setIsLoading(false);
    }
  }, [id]);

  useAsyncEffect(async ({ cancelled }) => {
    await fetchGrievanceDetails(cancelled);
  }, [fetchGrievanceDetails]);

  useAsyncEffect(async ({ cancelled }) => {
    try {
      const results = await Promise.all([
        masterApis.getTicketStatus(),
        masterApis.getTicketPriorities(),
        masterApis.getTypes(),
        masterApis.getAllCategories(),
        masterApis.getDepartments(1, 500, 'name', 'ASC'),
      ]);
      if (cancelled()) return;
      setStatusList(results[0].data || []);
      setPriorityList(results[1].data || []);
      setTypeList(results[2].data || []);
      setCategoryList(results[3].data || []);
      setDepartmentList(results[4].data || []);
    } catch (err) {
      if (!cancelled()) console.error('Error loading dropdown lists:', err);
    }
  }, []);

  useEffect(() => {
    if (!updateFormData.category_id) {
      setSubCategoryList([]);
      return undefined;
    }

    let cancelled = false;
    const loadSubCategories = async () => {
      setSubCategoriesLoading(true);
      try {
        const res = await masterApis.getSubCategoryByCategoryId(updateFormData.category_id, 1, 200);
        if (!cancelled) {
          setSubCategoryList(res?.data || []);
        }
      } catch (err) {
        if (!cancelled) console.error('Error loading sub-categories:', err);
      } finally {
        if (!cancelled) setSubCategoriesLoading(false);
      }
    };

    loadSubCategories();
    return () => { cancelled = true; };
  }, [updateFormData.category_id]);

  const handleUpdateTicket = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setActionError(null);
    try {
      const statusPriorityPayload = {
        status_id: Number(updateFormData.status_id),
        priority_id: Number(updateFormData.priority_id),
        category_id: Number(updateFormData.category_id),
      };
      if (grievance.source === 'public' && !updateFormData.sub_category_id) {
        statusPriorityPayload.sub_category_id = null;
      } else {
        statusPriorityPayload.sub_category_id = Number(updateFormData.sub_category_id);
      }

      const res = await grievanceApi.updateGrievance(id, statusPriorityPayload);

      if (res && res.success) {
        fetchGrievanceDetails();
        alert('Ticket updated successfully!');
      } else {
        setActionError(res?.message || 'Failed to update ticket');
      }
    } catch (err) {
      setActionError(err.message || 'An error occurred while updating the ticket');
    } finally {
      setIsUpdating(false);
    }
  };

  const assignedIds = Array.isArray(grievance?.current_assigned_employee_id)
    ? grievance.current_assigned_employee_id.map(Number)
    : [];
  const isAssigned = assignedIds.includes(Number(user?.employee_details_id));
  const canActOnPath = isAssigned || isAdmin;

  const pathNodes = Array.isArray(grievance?.path?.nodes) ? grievance.path.nodes : [];
  const currentSequence = Number(grievance?.current_node_sequence ?? 0);
  const currentPathNode = pathNodes.find((node) => Number(node.sequence) === currentSequence)
    || grievance?.currentPathNode
    || null;
  const nextPathNode = pathNodes.find((node) => Number(node.sequence) === currentSequence + 1) || null;
  const isTerminal = Boolean(currentPathNode?.is_terminal);
  const terminalRoleIds = currentPathNode?.role_ids || [];
  const userRoleId = Number(activeRole?.id);
  const hasTerminalNodeRole = terminalRoleIds.includes(userRoleId);
  const canForwardMidPath = Boolean(grievance?.path_id && canActOnPath && nextPathNode && !isTerminal);
  const nextNodeHasAssignees = grievance?.next_node_has_assignees !== false;
  const midPathForwardBlocked = canForwardMidPath && !nextNodeHasAssignees;
  const canForwardTerminal = Boolean(
    grievance?.path_id && canActOnPath && isTerminal && (isAdmin || hasTerminalNodeRole),
  );
  const showForward = canForwardMidPath || canForwardTerminal;
  const nextNodeLabel = grievance?.next_node_name || nextPathNode?.name || 'the next stage';

  const selectedForwardDepartment = useMemo(
    () => departmentList.find((dept) => String(dept.id) === String(forwardDepartmentId)) || null,
    [departmentList, forwardDepartmentId],
  );

  useEffect(() => {
    if (!canForwardTerminal) {
      setForwardEmployeeOptions([]);
      setForwardEmployeesLoading(false);
      return undefined;
    }

    const controller = new AbortController();

    const loadForwardEmployees = async () => {
      setForwardEmployeesLoading(true);
      try {
        const res = await masterApis.getEmployeeDetails(1, 500, {
          department_id: forwardDepartmentId || undefined,
          assignable_only: true,
          signal: controller.signal,
        });
        setForwardEmployeeOptions(res?.data || []);
      } catch (err) {
        if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
          console.error('Error loading forward employees:', err);
          setForwardEmployeeOptions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setForwardEmployeesLoading(false);
        }
      }
    };

    loadForwardEmployees();
    return () => controller.abort();
  }, [canForwardTerminal, forwardDepartmentId]);

  useEffect(() => {
    if (!forwardEmployeeId) return;
    const stillValid = forwardEmployeeOptions.some((emp) => String(emp.id) === String(forwardEmployeeId));
    if (!stillValid) {
      setForwardEmployeeId('');
    }
  }, [forwardEmployeeOptions, forwardEmployeeId]);

  const filteredCategories = useMemo(() => {
    if (!updateFormData.type_id) return categoryList;
    return categoryList.filter((cat) => Number(cat.type_id) === Number(updateFormData.type_id));
  }, [categoryList, updateFormData.type_id]);

  const handleForwardGrievance = () => {
    if (canForwardTerminal && !forwardEmployeeId) {
      return;
    }

    const selectedEmployee = forwardEmployeeOptions.find(
      (emp) => String(emp.id) === String(forwardEmployeeId),
    );
    const selectedDepartment = selectedForwardDepartment;

    showConfirm({
      title: 'Forward grievance',
      message: canForwardTerminal ? 'Forward this grievance to' : 'Forward this grievance to',
      entityName: canForwardTerminal
        ? [
            selectedEmployee?.name,
            selectedEmployee?.role?.name,
            selectedDepartment?.name,
          ].filter(Boolean).join(' · ') || 'selected employee'
        : (nextPathNode?.name || 'the next stage'),
      confirmLabel: 'Forward',
      variant: 'warning',
      showWarning: false,
      hideSubtitle: true,
      onConfirm: async () => {
        setIsUpdating(true);
        setActionError(null);
        try {
          const payload = canForwardTerminal
            ? {
                employee_id: forwardEmployeeId,
                ...(forwardDepartmentId ? { department_id: Number(forwardDepartmentId) } : {}),
              }
            : {};
          const res = await grievanceApi.forwardGrievance(id, payload);
          if (res && res.success) {
            setForwardDepartmentId('');
            setForwardEmployeeId('');
            fetchGrievanceDetails();
          } else {
            setActionError(res?.message || 'Failed to forward grievance.');
          }
        } catch (err) {
          setActionError(err.message || 'Error forwarding grievance.');
        } finally {
          setIsUpdating(false);
        }
      },
    });
  };

  if (isLoading) {
    return (
      <div className="hod-dashboard grievance-detail-page">
        <div className="gd-loading">
          <div className="gd-spinner" aria-hidden="true" />
          <p className="gd-loading-text">Loading grievance details...</p>
        </div>
      </div>
    );
  }

  if (error || !grievance) {
    return (
      <div className="hod-dashboard grievance-detail-page">
        <button type="button" className="gd-back-btn" onClick={() => navigate(backPath)}>
          <i className="fa-solid fa-arrow-left" /> {backLabel}
        </button>
        <div className="dashboard-card gd-error-card">
          <p className="gd-error-text">{error || 'Grievance not found.'}</p>
          <button type="button" onClick={() => fetchGrievanceDetails()} className="gd-submit-btn">Retry</button>
        </div>
      </div>
    );
  }

  const submitterName = grievance.full_name || grievance.student?.name || 'Citizen';
  const submitterPhone = grievance.mobile_number || grievance.student?.phone_number || 'N/A';
  const isPublicGrievance = grievance.source === 'public';

  const priorityTone = getPriorityTone(grievance.priority?.name || 'Medium');
  const statusTone = getStatusTone(grievance.status?.name || 'Under Review');

  const formattedDate = new Date(grievance.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const formattedTime = new Date(grievance.createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const assignedLabel = Array.isArray(grievance.assignedEmployees) && grievance.assignedEmployees.length > 0
    ? grievance.assignedEmployees.map((emp) => emp.name).join(', ')
    : 'Unassigned';

  const locationLabel = [
    grievance.location_state_name,
    grievance.location_district_name,
    grievance.location_area_name,
    grievance.location_sub_area_name,
    grievance.location_settlement_name,
  ].filter(Boolean).join(', ');

  const attachmentUrl = resolveAttachmentUrl(grievance.image_url);
  const showAttachmentPreview = isImageAttachment(grievance.image_url);

  return (
    <div className="hod-dashboard grievance-detail-page">
      <header className="gd-page-header">
        <button type="button" className="gd-back-btn" onClick={() => navigate(backPath)}>
          <i className="fa-solid fa-arrow-left" />
          {backLabel}
        </button>
        <div className="gd-page-title-wrap">
          <h1>Grievance Details</h1>
          <p>Review ticket information and manage updates</p>
        </div>
      </header>

      <div className="gd-layout">
        <div className="gd-main-col">
          <section className="dashboard-card gd-ticket-card">
            <div className="gd-ticket-top">
              <div className="gd-badge-row">
                <span className="gd-ticket-id">#{grievance.public_ticket_no}</span>
                <span className={`gd-badge priority-${priorityTone}`}>
                  {grievance.priority?.name || 'Medium'} Priority
                </span>
                <span className={`gd-badge status-${statusTone}`}>
                  {grievance.status?.name || 'Under Review'}
                </span>
              </div>
              <h2 className="gd-subject">{grievance.subject}</h2>
            </div>

            {grievance.description && (
              <div className="gd-section">
                <h3 className="gd-section-title">
                  <i className="fa-regular fa-file-lines" /> Description
                </h3>
                <p className="gd-description">{grievance.description}</p>
              </div>
            )}

            <div className="gd-section">
              <h3 className="gd-section-title">
                <i className="fa-solid fa-circle-info" /> Ticket Information
              </h3>
              <div className="gd-meta-grid">
                <MetaItem icon="fa-regular fa-user" label="Complainant" value={submitterName} sub={submitterPhone} />
                <MetaItem
                  icon="fa-regular fa-folder-open"
                  label="Category"
                  value={grievance.category?.name || 'N/A'}
                  sub={grievance.subCategory?.name || '—'}
                />
                <MetaItem
                  icon="fa-regular fa-calendar"
                  label="Submitted On"
                  value={formattedDate}
                  sub={`${formattedTime}`}
                />
                <MetaItem icon="fa-solid fa-user-tie" label="Assigned To" value={assignedLabel} />
                {grievance.path_id && (
                  <MetaItem
                    icon="fa-solid fa-route"
                    label="Current Stage"
                    value={currentPathNode?.name || `Stage ${currentSequence + 1}`}
                    sub={[
                      grievance.path?.name || 'Grievance Path',
                      currentPathNode?.roles_label,
                    ].filter(Boolean).join(' · ')}
                  />
                )}
              </div>
            </div>

            {isPublicGrievance && (grievance.permanent_address || locationLabel || grievance.aadhaar_or_voter_id) && (
              <div className="gd-section">
                <h3 className="gd-section-title">
                  <i className="fa-solid fa-location-dot" /> Citizen & Location
                </h3>
                <div className="gd-meta-grid">
                  {grievance.permanent_address && (
                    <MetaItem icon="fa-solid fa-location-dot" label="Address" value={grievance.permanent_address} />
                  )}
                  {locationLabel && (
                    <MetaItem
                      icon="fa-solid fa-map"
                      label={grievance.jurisdiction_type === 'municipality' ? 'Municipality' : 'Block Location'}
                      value={locationLabel}
                    />
                  )}
                  {grievance.aadhaar_or_voter_id && (
                    <MetaItem icon="fa-solid fa-id-card" label="Aadhaar / Voter ID" value={grievance.aadhaar_or_voter_id} />
                  )}
                </div>
              </div>
            )}

            {grievance.image_url && (
              <div className="gd-section">
                <h3 className="gd-section-title">
                  <i className="fa-solid fa-paperclip" /> Attachment
                </h3>
                {showAttachmentPreview && (
                  <div className="gd-attachment-preview">
                    <img src={attachmentUrl} alt="Grievance attachment" />
                  </div>
                )}
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gd-attachment-link"
                >
                  <i className="fa-solid fa-image" />
                  {showAttachmentPreview ? 'Open in New Tab' : 'View Attached File'}
                  <i className="fa-solid fa-arrow-up-right-from-square" />
                </a>
              </div>
            )}
          </section>
        </div>

        <SidebarControls
          updateFormData={updateFormData}
          setUpdateFormData={setUpdateFormData}
          handleUpdateTicket={handleUpdateTicket}
          isUpdating={isUpdating}
          actionError={actionError}
          statusList={statusList}
          priorityList={priorityList}
          handleForwardGrievance={handleForwardGrievance}
          showForward={showForward}
          canForwardTerminal={canForwardTerminal}
          canForwardMidPath={canForwardMidPath}
          midPathForwardBlocked={midPathForwardBlocked}
          nextNodeLabel={nextNodeLabel}
          nextPathNode={nextPathNode}
          forwardDepartmentId={forwardDepartmentId}
          setForwardDepartmentId={setForwardDepartmentId}
          forwardEmployeeId={forwardEmployeeId}
          setForwardEmployeeId={setForwardEmployeeId}
          departmentList={departmentList}
          forwardEmployeeOptions={forwardEmployeeOptions}
          forwardEmployeesLoading={forwardEmployeesLoading}
          selectedForwardDepartment={selectedForwardDepartment}
          typeList={typeList}
          filteredCategories={filteredCategories}
          subCategoryList={subCategoryList}
          subCategoriesLoading={subCategoriesLoading}
          isPublicGrievance={isPublicGrievance}
        />
      </div>
      <ConfirmDialog />
    </div>
  );
};

export default GrievanceDetail;


const MetaItem = ({ icon, label, value, sub }) => (
  <div className="gd-meta-item">
    <i className={icon} aria-hidden="true" />
    <div>
      <span className="gd-meta-label">{label}</span>
      <span className="gd-meta-value">{value}</span>
      {sub && <span className="gd-meta-sub">{sub}</span>}
    </div>
  </div>
);


const SidebarControls = ({
  updateFormData,
  setUpdateFormData,
  handleUpdateTicket,
  isUpdating,
  actionError = null,
  statusList,
  priorityList,
  handleForwardGrievance,
  showForward = false,
  canForwardTerminal = false,
  canForwardMidPath = false,
  midPathForwardBlocked = false,
  nextNodeLabel = 'the next stage',
  nextPathNode = null,
  forwardDepartmentId = '',
  setForwardDepartmentId,
  forwardEmployeeId = '',
  setForwardEmployeeId,
  departmentList = [],
  forwardEmployeeOptions = [],
  forwardEmployeesLoading = false,
  selectedForwardDepartment = null,
  typeList,
  filteredCategories,
  subCategoryList,
  subCategoriesLoading,
  isPublicGrievance = false,
}) => {
  const filterDepartmentOption = (query, dept) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      String(dept.name || '').toLowerCase().includes(q)
      || String(dept.code || '').toLowerCase().includes(q)
    );
  };

  const filterEmployeeOption = (query, emp) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      String(emp.name || '').toLowerCase().includes(q)
      || String(emp.role?.name || '').toLowerCase().includes(q)
    );
  };

  const departmentHasNoRoles = Boolean(
    forwardDepartmentId
    && !forwardEmployeesLoading
    && forwardEmployeeOptions.length === 0,
  );

  return (
    <aside className="gd-side-col">
      <section className="dashboard-card gd-actions-card">
        <div className="card-head">
          <h3>Manage Ticket</h3>
        </div>
        <form onSubmit={handleUpdateTicket} className="gd-form">
          <div className="gd-form-row">
            <div className="gd-field">
              <label htmlFor="gd-status">Status</label>
              <select
                id="gd-status"
                value={updateFormData.status_id}
                onChange={(e) => setUpdateFormData((prev) => ({ ...prev, status_id: e.target.value }))}
              >
                <option value="" disabled>Select Status</option>
                {statusList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="gd-field">
              <label htmlFor="gd-priority">Priority</label>
              <select
                id="gd-priority"
                value={updateFormData.priority_id}
                onChange={(e) => setUpdateFormData((prev) => ({ ...prev, priority_id: e.target.value }))}
              >
                <option value="" disabled>Select Priority</option>
                {priorityList.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="gd-field">
            <label htmlFor="gd-type">Grievance Type</label>
            <select
              id="gd-type"
              value={updateFormData.type_id}
              onChange={(e) => setUpdateFormData((prev) => ({
                ...prev,
                type_id: e.target.value,
                category_id: '',
                sub_category_id: '',
              }))}
            >
              <option value="" disabled>Select Type</option>
              {typeList.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          <div className="gd-form-row">
            <div className="gd-field">
              <label htmlFor="gd-category">Category</label>
              <select
                id="gd-category"
                value={updateFormData.category_id}
                onChange={(e) => setUpdateFormData((prev) => ({
                  ...prev,
                  category_id: e.target.value,
                  sub_category_id: '',
                }))}
                disabled={!updateFormData.type_id}
              >
                <option value="" disabled>Select Category</option>
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="gd-field">
              <label htmlFor="gd-subcategory">Sub-category</label>
              <select
                id="gd-subcategory"
                value={updateFormData.sub_category_id}
                onChange={(e) => setUpdateFormData((prev) => ({ ...prev, sub_category_id: e.target.value }))}
                disabled={!updateFormData.category_id || subCategoriesLoading}
              >
                <option value="" disabled={!isPublicGrievance}>
                  {subCategoriesLoading ? 'Loading...' : (isPublicGrievance ? 'None (optional)' : 'Select Sub-category')}
                </option>
                {subCategoryList.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" disabled={isUpdating} className="gd-submit-btn">
            {isUpdating ? 'Updating...' : 'Save Changes'}
          </button>

          {actionError && (
            <p className="gd-action-error" role="alert">{actionError}</p>
          )}

          {showForward && (
            <>
              <div className="gd-divider" />

              <p className="gd-quick-label">Assign To</p>
              <div className="gd-quick-actions">
                {midPathForwardBlocked && (
                  <p className="gd-forward-warning" role="status">
                    Cannot forward: no employees are available at the next stage ({nextNodeLabel}).
                  </p>
                )}
                {canForwardTerminal && (
                  <>
                    <div className="gd-field">
                      <label htmlFor="gd-forward-department">Department (optional filter)</label>
                      <SearchableSelect
                        id="gd-forward-department"
                        options={departmentList}
                        value={forwardDepartmentId}
                        onChange={(nextValue) => {
                          setForwardDepartmentId(nextValue);
                          setForwardEmployeeId('');
                        }}
                        placeholder="All departments"
                        searchPlaceholder="Search departments…"
                        allowClear
                        clearLabel="Show all employees"
                        getOptionLabel={(dept) => `${dept.name}${dept.code ? ` (${dept.code})` : ''}`}
                        getOptionValue={(dept) => String(dept.id)}
                        filterFn={filterDepartmentOption}
                      />
                    </div>
                    <div className="gd-field">
                      <label htmlFor="gd-forward-employee">Forward to employee</label>
                      <SearchableSelect
                        id="gd-forward-employee"
                        options={forwardEmployeeOptions}
                        value={forwardEmployeeId}
                        onChange={setForwardEmployeeId}
                        placeholder={forwardEmployeesLoading ? 'Loading employees…' : 'Select employee'}
                        searchPlaceholder="Search by name or role…"
                        disabled={forwardEmployeesLoading}
                        emptyMessage={forwardEmployeesLoading
                          ? 'Loading employees…'
                          : (departmentHasNoRoles
                            ? 'No employees found for this department'
                            : 'No employees found')}
                        getOptionLabel={(emp) => `${emp.name}${emp.role?.name ? ` · ${emp.role.name}` : ''}`}
                        getOptionValue={(emp) => String(emp.id)}
                        filterFn={filterEmployeeOption}
                        renderOption={(emp) => (
                          <>
                            <span className="searchable-select-option-title">{emp.name}</span>
                            {emp.role?.name && (
                              <span className="searchable-select-option-sub">{emp.role.name}</span>
                            )}
                          </>
                        )}
                      />
                    </div>
                  </>
                )}
                <button
                  type="button"
                  className="gd-action-btn forward"
                  onClick={handleForwardGrievance}
                  disabled={
                    isUpdating
                    || midPathForwardBlocked
                    || (canForwardTerminal && !forwardEmployeeId)
                  }
                >
                  <i className="fa-solid fa-share" />
                  {canForwardMidPath
                    ? `Forward${nextPathNode?.name ? ` to ${nextPathNode.name}` : ''}`
                    : 'Forward'}
                </button>
              </div>
            </>
          )}
        </form>
      </section>
    </aside>
  );
};