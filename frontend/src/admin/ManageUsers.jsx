import React, { useEffect, useMemo, useState } from 'react';
import '../styles/admin/ManageUsers.css';
import '../styles/admin/AdminShared.css';
import Modal from '../components/UI/Modal';
import ConfirmModal from '../components/UI/ConfirmModal';
import DebouncedSearchInput from '../components/UI/DebouncedSearchInput';
import PaginationPageNumbers from '../components/UI/PaginationPageNumbers';
import { masterApis, userApi } from '../services/api/api';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchRolesThunk,
  fetchDepartmentsThunk,
  fetchTicketStatusesThunk,
  fetchPaginatedUsersThunk,
  updateUserStatusLocally
} from '../store/slices/usersSlice';

const toneColors = ['blue', 'green', 'purple', 'amber'];

const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const tabs = [
  { key: 'All', label: 'All Users' },
  { key: 'HOD', label: 'HODs' },
  { key: 'Staff', label: 'Staff' },
  { key: 'Inactive', label: 'Inactive Users' },
];

const formatCount = (n) => n.toLocaleString();

const getRolePillClass = (roleLabel) => {
  const primary = String(roleLabel || '').trim().toLowerCase();
  if (primary.includes('student')) return 'student';
  if (primary.includes('hod')) return 'hod';
  return 'staff';
};


const ManageUsers = () => {
  const dispatch = useDispatch();
  const {
    usersArray,
    totalUsers,
    totalPages,
    roleArray,
    departmentArray,
    statusArray,
    loading: isLoading
  } = useSelector((state) => state.users);

  const [role, setRole] = useState('All Roles');
  const [department, setDepartment] = useState('All Departments');
  const [status, setStatus] = useState('All Status');
  const [query, setQuery] = useState('');
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [activeTab, setActiveTab] = useState('All');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, confirmLabel: 'Confirm', variant: 'danger' });
  const showConfirm = (opts) => setConfirmModal({ isOpen: true, confirmLabel: 'Confirm', variant: 'danger', ...opts });
  const closeConfirm = () => setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Build a role lookup map: role_id -> role name
  const roleMap = useMemo(() => {
    const map = {};
    roleArray.forEach((r) => { map[r.id] = r.name; });
    return map;
  }, [roleArray]);

  // Transform raw API users into the shape the table expects
  const userRows = useMemo(() => {
    return usersArray.map((u, idx) => {
      const roleId = u.role_id != null ? Number(u.role_id) : null;
      const roleName = roleId ? (roleMap[roleId] || 'Unknown') : 'Unknown';
      const statusLabel = u.account_status
        ? u.account_status.charAt(0).toUpperCase() + u.account_status.slice(1)
        : 'Unknown';
      return {
        id: u.id,
        name: u.name || '—',
        email: u.email || '—',
        role: roleName,
        role_id: roleId,
        status: statusLabel,
        joinedOn: formatDate(u.createdAt),
        avatar: getInitials(u.name),
        tone: toneColors[idx % toneColors.length],
      };
    });
  }, [usersArray, roleMap]);

  const paged = userRows;
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + paged.length;

  const clearFilters = () => {
    setRole('All Roles');
    setStatus('All Status');
    setQuery('');
    setActiveTab('All');
    setPage(1);
    setSortField('createdAt');
    setSortOrder('DESC');
    setSearchResetKey((k) => k + 1);
  };

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

  const setTab = (key) => {
    setActiveTab(key);
    setPage(1);
  };

  // ==================================API integrations here ======================================= //

  //Getting all the roles
  const getAllRoles = () => {
    dispatch(fetchRolesThunk()).unwrap().catch(console.error);
  };

  //getting all the departments
  const getAllDepartments = () => {
    dispatch(fetchDepartmentsThunk()).unwrap().catch(console.error);
  };

  //getting all the ticket status
  const getAllTicketStatus = () => {
    dispatch(fetchTicketStatusesThunk()).unwrap().catch(console.error);
  };

  const fetchPaginatedUsers = () => {
    dispatch(fetchPaginatedUsersThunk({
      page,
      limit: rowsPerPage,
      role,
      status,
      search: query,
      activeTab,
      sortField,
      sortOrder
    })).unwrap().catch(console.error);
  };

  const getAllUsers = () => {
    fetchPaginatedUsers();
  };

  useEffect(() => {
    getAllRoles();
    getAllDepartments();
    getAllTicketStatus();
  }, []);

  useEffect(() => {
    fetchPaginatedUsers();
  }, [page, rowsPerPage, role, status, query, activeTab, sortField, sortOrder]);

  const handleDeactivateUser = async (id) => {
    try {
      const response = await userApi.updateUserAccount(id, { account_status: 'inactive' });
      if (response.success) {
        dispatch(updateUserStatusLocally({ id, status: 'inactive' }));
      } else {
        alert(response.message || 'Failed to deactivate user account');
      }
    } catch (err) {
      alert(err.message || 'Error deactivating user account');
    }
  };

  const handleReactivateUser = async (id) => {
    try {
      const response = await userApi.updateUserAccount(id, { account_status: 'active' });
      if (response.success) {
        dispatch(updateUserStatusLocally({ id, status: 'active' }));
      } else {
        alert(response.message || 'Failed to reactivate user account');
      }
    } catch (err) {
      alert(err.message || 'Error reactivating user account');
    }
  };

  const handlePermanentDeleteUser = (id) => {
    showConfirm({
      title: 'Permanently Delete User',
      message: 'Are you sure you want to PERMANENTLY delete this user account? This action cannot be undone and will delete all user data.',
      confirmLabel: 'Permanent Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await userApi.deleteUserAccount(id);
          if (response.success) {
            alert('User account permanently deleted successfully!');
            getAllUsers();
          } else {
            alert(response.message || 'Failed to delete user account');
          }
        } catch (err) {
          alert(err.message || 'Error deleting user account');
        }
        closeConfirm();
      },
    });
  };

  return (
    <div className="mu-page">
      <div className="mu-hero">
        <div>
          <h1 className="mu-title">Manage Users</h1>
          <p className="mu-subtitle">Create, view, edit and manage all users in the system.</p>
        </div>

        <div className="mu-actions">
          <button type="button" className="mu-btn mu-btn-primary" onClick={() => setIsAddUserModalOpen(true)}>
            <i className="fa-solid fa-plus" />
            Add User
          </button>
        </div>
      </div>

      <section className="mu-panel">
        <div className="mu-filters">
          <div className="mu-filter">
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {roleArray.length > 0 ? (
                <>
                  <option value="All Roles">All Roles</option>
                  {roleArray.filter(r => r.is_active !== false).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </>
              ) : (
                <option value="All Roles">No roles available</option>
              )}
            </select>
          </div>

          <div className="mu-filter">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          <DebouncedSearchInput
            key={searchResetKey}
            placeholder="Search users..."
            onDebouncedChange={(val) => { setQuery(val); setPage(1); }}
            className="mu-search"
          />

          <button type="button" className="mu-filter-btn">
            <i className="fa-solid fa-filter" />
            Filters
          </button>

          <button type="button" className="mu-clear" onClick={clearFilters}>
            <i className="fa-solid fa-rotate-right" />
            Clear Filters
          </button>
        </div>

        <div className="mu-table-container">
          <table className="mu-table">
            <thead>
              <tr>
                <th>
                  <button type="button" className={`table-header-sort-btn ${sortField === 'id' ? 'active' : ''}`} onClick={() => handleSort('id')}>
                    <span>USER ID</span>
                    <SortIcon field="id" />
                  </button>
                </th>
                <th>
                  <button type="button" className={`table-header-sort-btn ${sortField === 'name' ? 'active' : ''}`} onClick={() => handleSort('name')}>
                    <span>NAME</span>
                    <SortIcon field="name" />
                  </button>
                </th>
                <th>
                  <button type="button" className={`table-header-sort-btn ${sortField === 'email' ? 'active' : ''}`} onClick={() => handleSort('email')}>
                    <span>EMAIL</span>
                    <SortIcon field="email" />
                  </button>
                </th>
                <th>ROLE</th>
                <th>
                  <button type="button" className={`table-header-sort-btn ${sortField === 'account_status' ? 'active' : ''}`} onClick={() => handleSort('account_status')}>
                    <span>STATUS</span>
                    <SortIcon field="account_status" />
                  </button>
                </th>
                <th>
                  <button type="button" className={`table-header-sort-btn ${sortField === 'createdAt' ? 'active' : ''}`} onClick={() => handleSort('createdAt')}>
                    <span>JOINED ON</span>
                    <SortIcon field="createdAt" />
                  </button>
                </th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Loading users...
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No users found
                  </td>
                </tr>
              ) : paged.map((user) => (
                <tr key={user.id}>
                  <td className="mu-td-id">{user.id}</td>
                  <td>
                    <div className="mu-user">
                      <div className={`mu-avatar mu-avatar-${user.tone}`}>{user.avatar}</div>
                      <span className="mu-td-name">{user.name}</span>
                    </div>
                  </td>
                  <td className="mu-td-email">{user.email}</td>
                  <td>
                    <span className={`mu-pill mu-pill-${getRolePillClass(user.role)}`}>{user.role}</span>
                  </td>
                  <td>
                    <div
                      className="cm-status-toggle-wrap"
                      onClick={() => {
                        if (user.status === 'Inactive') {
                          handleReactivateUser(user.id);
                        } else {
                          handleDeactivateUser(user.id);
                        }
                      }}
                      title={user.status !== 'Inactive' ? 'Click to deactivate' : 'Click to activate'}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className={`cm-toggle-switch ${user.status !== 'Inactive' ? 'on' : 'off'}`}>
                        <div className="cm-toggle-knob" />
                      </div>
                      <span className={`cm-status-pill ${user.status !== 'Inactive' ? 'active' : 'inactive'}`}>
                        {user.status}
                      </span>
                    </div>
                  </td>
                  <td className="mu-td-date">{user.joinedOn}</td>
                  <td>
                    <div className="mu-actions-col">
                      <button
                        className="mu-icon-btn edit-btn"
                        type="button"
                        aria-label="Edit"
                        onClick={() => setEditingUser(user)}
                        style={{ color: '#2563eb' }}
                        title="Edit User"
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                      <button
                        className="mu-icon-btn delete-btn"
                        type="button"
                        aria-label="Permanent Delete"
                        onClick={() => handlePermanentDeleteUser(user.id)}
                        style={{ color: '#ef4444' }}
                        title="Permanent Delete"
                      >
                        <i className="fa-regular fa-trash-can" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mu-footer">
          <div className="mu-results">
            Showing {totalUsers === 0 ? 0 : startIndex + 1} to {endIndex} of {formatCount(totalUsers)} entries
          </div>

          <div className="mu-pagination">
            <button
              type="button"
              className="mu-page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous"
            >
              <i className="fa-solid fa-chevron-left" />
            </button>

            <PaginationPageNumbers
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              buttonClassName="mu-page-btn"
            />

            <button
              type="button"
              className="mu-page-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Next"
            >
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>

          <div className="mu-rows">
            <span>Rows per page</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </section>

      <AddEmployeeModal
        isOpen={isAddUserModalOpen}
        onClose={() => { setIsAddUserModalOpen(false); getAllUsers(); }}
        roleArray={roleArray}
        departmentArray={departmentArray}
      />

      <EditUserModal
        isOpen={editingUser !== null}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        roleArray={roleArray}
        getAllUsers={getAllUsers}
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

const AddEmployeeModal = ({ isOpen, onClose, roleArray, departmentArray }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    mobile_number: '',
  });
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [freshRoles, setFreshRoles] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', email: '', password: '', mobile_number: '' });
      setSelectedRoleId('');
      setErrorMsg('');
      setShowPassword(false);
      masterApis.getRoles()
        .then((res) => {
          const data = res?.data || res || [];
          setFreshRoles(Array.isArray(data) ? data : []);
        })
        .catch(() => setFreshRoles(roleArray));
    }
  }, [isOpen]);

  const activeRoles = freshRoles.length > 0 ? freshRoles : roleArray;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (formData.mobile_number && formData.mobile_number.trim()) {
      if (!/^\d{10}$/.test(formData.mobile_number.trim())) {
        setErrorMsg('Mobile Number must be exactly 10 digits.');
        return;
      }
    }

    if (!selectedRoleId) {
      setErrorMsg('Please assign a role.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role_id: Number(selectedRoleId),
        mobile_number: formData.mobile_number.trim() || null,
      };

      const response = await masterApis.createEmployeeDetails(payload);
      if (response.success) {
        alert("Employee user account created successfully!");
        onClose();
      } else {
        setErrorMsg(response.message || "Failed to create employee");
      }
    } catch (err) {
      setErrorMsg(err.message || "Error creating employee");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New User"
      subtitle="Enter details to create a new employee and user login account."
      maxWidth="450px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {errorMsg && (
          <div style={{ padding: '10px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter full name"
            style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Email Address</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Enter email address"
            style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Mobile Number</label>
          <input
            type="tel"
            value={formData.mobile_number}
            onChange={(e) => setFormData(prev => ({ ...prev, mobile_number: e.target.value }))}
            placeholder="Enter 10-digit mobile number"
            maxLength="10"
            style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Role</label>
          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            required
            style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
          >
            <option value="">Select role</option>
            {activeRoles.filter((r) => r.is_active !== false).map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Enter password"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 42px 10px 14px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                border: 'none',
                background: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{ padding: '10px 16px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            style={{ padding: '10px 20px', background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(37, 99, 235, 0.18)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {isLoading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" />
                <span>Creating...</span>
              </>
            ) : (
              "Create User"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const EditUserModal = ({
  isOpen,
  onClose,
  user,
  roleArray,
  getAllUsers
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    status: '',
    mobile_number: '',
  });
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [detailsRecord, setDetailsRecord] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch associated details record when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        status: user.status || 'Active',
        mobile_number: '',
      });
      setSelectedRoleId('');
      setDetailsRecord(null);
      setErrorMsg('');

      const initialRoleId = user.role_id != null ? Number(user.role_id) : '';
      setSelectedRoleId(initialRoleId ? String(initialRoleId) : '');

      const fetchDetails = async () => {
        setIsLoadingDetails(true);
        try {
          let found = null;
          const res = await masterApis.getEmployeeDetails();
          found = (res.data || res || []).find(e => e.email === user.email);

          if (found) {
            setDetailsRecord(found);
            setFormData(prev => ({
              ...prev,
              mobile_number: found.mobile_number || found.phone_number || '',
            }));
          }
        } catch (err) {
          console.error("Failed to fetch user details record:", err);
        } finally {
          setIsLoadingDetails(false);
        }
      };

      fetchDetails();
    }
  }, [isOpen, user, roleArray]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!selectedRoleId) {
      setErrorMsg('Please assign a role.');
      return;
    }

    setIsSubmitting(true);

    try {
      const userPayload = {
        name: formData.name,
        email: formData.email,
        role_id: Number(selectedRoleId),
      };

      // 1. Update User Account
      const userRes = await userApi.updateUserAccount(user.id, userPayload);

      if (!userRes.success) {
        throw new Error(userRes.message || "Failed to update user account");
      }

      // 2. Update employee details if record exists
      if (detailsRecord) {
        const empRes = await masterApis.updateEmployeeDetails(detailsRecord.id, {
          name: formData.name,
          role_id: Number(selectedRoleId),
          mobile_number: formData.mobile_number || null
        });
        if (!empRes.success) {
          throw new Error(empRes.message || "Failed to update employee details");
        }
      }

      alert("User updated successfully!");
      onClose();
      getAllUsers();
    } catch (err) {
      setErrorMsg(err.message || "Error updating user");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit User Details"
      subtitle="Modify profile information, roles, and structural assignments."
      maxWidth="450px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {isLoadingDetails ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '0.85rem' }}>
            Loading associated details...
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter full name"
                style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
                style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Mobile Number</label>
              <input
                type="tel"
                value={formData.mobile_number}
                onChange={(e) => setFormData(prev => ({ ...prev, mobile_number: e.target.value }))}
                placeholder="Enter 10-digit mobile number"
                maxLength="10"
                style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Role</label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                required
                style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
              >
                <option value="">Select role</option>
                {roleArray.filter((r) => r.is_active !== false).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

          </>
        )}

        {errorMsg && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <i className="fa-solid fa-circle-exclamation" style={{ marginTop: '2px', flexShrink: 0 }} />
            <span style={{ whiteSpace: 'pre-line' }}>{errorMsg}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '4px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isLoadingDetails}
            style={{ padding: '10px 16px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isLoadingDetails}
            style={{ padding: '10px 20px', background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(37, 99, 235, 0.18)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {isSubmitting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" />
                <span>Saving...</span>
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ManageUsers;
