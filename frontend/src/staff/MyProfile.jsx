import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { masterApis, userApi } from '../services/api/api';
import usePasswordReset from '../hooks/usePasswordReset';
import PasswordResetSection from '../components/profile/PasswordResetSection';
import { isDepartmentScopedRole } from '../utils/departmentAuth';
import '../styles/staff/CommonStaff.css';
import '../styles/Profile.css';

const EditHODProfileModal = ({ isOpen, onClose, employeeInfo, onSaveSuccess }) => {
  const [editName, setEditName] = useState(employeeInfo?.name || '');
  const [editDeptId, setEditDeptId] = useState(employeeInfo?.department_id || '');
  const [editMobile, setEditMobile] = useState(employeeInfo?.mobile_number || '');

  const [departments, setDepartments] = useState([]);

  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setEditName(employeeInfo?.name || '');
    setEditDeptId(employeeInfo?.department_id || '');
    setEditMobile(employeeInfo?.mobile_number || '');
    setError('');
    setSuccess('');

    const loadOptions = async () => {
      setLoadingData(true);
      try {
        const deptsRes = await masterApis.getDepartments();
        if (deptsRes && deptsRes.success) setDepartments(deptsRes.data || []);
      } catch (err) {
        console.error('Error loading HOD edit options:', err);
        setError('Failed to load department options.');
      } finally {
        setLoadingData(false);
      }
    };

    loadOptions();
  }, [isOpen, employeeInfo]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      setError('Full Name is required.');
      return;
    }
    
    if (editMobile && editMobile.trim()) {
      if (!/^\d{10}$/.test(editMobile.trim())) {
        setError('Mobile Number must be exactly 10 digits.');
        return;
      }
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const payload = {
        name: editName.trim(),
        department_id: editDeptId ? Number(editDeptId) : null,
        mobile_number: editMobile.trim() || null,
      };
      
      const res = await masterApis.updateEmployeeDetails(employeeInfo.id, payload);
      if (res && res.success) {
        setSuccess('Profile updated successfully!');
        
        if (onSaveSuccess) {
          await onSaveSuccess();
        }
        
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error(res?.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Error updating employee profile:', err);
      setError(err.message || 'An error occurred while updating your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="edit-modal-overlay">
      <style>{`
        .edit-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          animation: fadeIn 0.25s ease-out;
        }
        .edit-modal-card {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 550px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          border: 1px solid #e2e8f0;
          overflow: hidden;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .edit-modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
        }
        .edit-modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #0f172a;
        }
        .close-modal-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          font-size: 1.25rem;
          transition: color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .close-modal-btn:hover {
          color: #0f172a;
        }
        .edit-modal-body {
          padding: 24px;
          max-height: 65vh;
          overflow-y: auto;
        }
        .edit-form-group {
          margin-bottom: 18px;
        }
        .edit-form-group.readonly-field {
          opacity: 0.75;
        }
        .edit-form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #334155;
          margin-bottom: 6px;
        }
        .edit-form-group input,
        .edit-form-group select {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.95rem;
          color: #0f172a;
          background-color: #fff;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .edit-form-group input:focus,
        .edit-form-group select:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
          outline: none;
        }
        .edit-form-group input:disabled,
        .edit-form-group select:disabled {
          background-color: #f1f5f9;
          cursor: not-allowed;
          border-color: #e2e8f0;
        }
        .edit-modal-footer {
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: #f8fafc;
        }
        .essential-badge {
          font-size: 0.75rem;
          background: #fee2e2;
          color: #ef4444;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: 8px;
          font-weight: 500;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div className="edit-modal-card">
        <div className="edit-modal-header">
          <h3>Edit Profile</h3>
          <button className="close-modal-btn" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        <form onSubmit={handleSave}>
          <div className="edit-modal-body">
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#ef4444',
                fontSize: '0.875rem',
                backgroundColor: '#fef2f2',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '18px',
                border: '1px solid #fca5a5'
              }}>
                <i className="fa-solid fa-circle-exclamation" />
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#10b981',
                fontSize: '0.875rem',
                backgroundColor: '#ecfdf5',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '18px',
                border: '1px solid #a7f3d0'
              }}>
                <i className="fa-solid fa-circle-check" />
                <span>{success}</span>
              </div>
            )}

            {loadingData ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
                <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ color: '#2563eb', marginBottom: '12px' }} />
                <p>Loading available options...</p>
              </div>
            ) : (
              <>
                <div className="edit-form-group">
                  <label htmlFor="editName">Full Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    id="editName"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="edit-form-group">
                  <label htmlFor="editDept">Department</label>
                  <select
                    id="editDept"
                    value={editDeptId}
                    onChange={(e) => setEditDeptId(e.target.value)}
                    disabled={saving}
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div className="edit-form-group">
                  <label htmlFor="editMobile">Mobile Number</label>
                  <input
                    id="editMobile"
                    type="tel"
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    disabled={saving}
                    maxLength="10"
                  />
                </div>

                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '18px', marginTop: '24px' }}>
                  <h4 style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600', marginBottom: '14px' }}>
                    Protected Account Details
                  </h4>
                  
                  <div className="edit-form-group readonly-field">
                    <label>Email Address <span className="essential-badge">Read-only</span></label>
                    <input type="text" value={employeeInfo?.email} disabled />
                  </div>

                  <div className="edit-form-group readonly-field">
                    <label>Role <span className="essential-badge">Read-only</span></label>
                    <input type="text" value={employeeInfo?.role?.name || 'HOD'} disabled />
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="edit-modal-footer">
            <button 
              type="button" 
              className="outline-btn" 
              onClick={onClose}
              disabled={saving}
              style={{ padding: '10px 20px', border: '1px solid #cbd5e1', color: '#475569' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="edit-profile-btn" 
              disabled={loadingData || saving}
              style={{ padding: '10px 24px', margin: 0 }}
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }} />
                  Saving Changes...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MyProfile = () => {
  const {
    user,
    activeRole,
    activeDepartment,
    getDepartmentsForActiveRole,
  } = useAuth();
  const assignedDepartments = useMemo(
    () => getDepartmentsForActiveRole(),
    [getDepartmentsForActiveRole],
  );
  const hasDepartmentScope = isDepartmentScopedRole(activeRole);
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasLoadedOnceRef = useRef(false);
  const employeeIdentityKey = user?.employee_details_id || user?.email || '';

  const profileEmail = employeeInfo?.email || user?.email || '';
  const { sending: resetSending, message: resetMessage, error: resetError, requestReset } = usePasswordReset(
    (email) => userApi.forgotPassword(email),
  );

  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    const fetchEmployeeProfile = async () => {
      if (!employeeIdentityKey) return;

      const isFirstLoad = !hasLoadedOnceRef.current;
      if (isFirstLoad) {
        setLoading(true);
      }
      setError(null);

      try {
        if (user?.employee_details_id) {
          const res = await masterApis.getEmployeeDetailsById(user.employee_details_id);
          if (res && res.success && res.data) {
            setEmployeeInfo(res.data);
            return;
          }
        }

        if (user?.email) {
          const allRes = await masterApis.getEmployeeDetails();
          if (allRes && allRes.success && allRes.data) {
            const match = allRes.data.find(
              (e) => e.email && e.email.toLowerCase() === user.email.toLowerCase()
            );
            if (match) {
              setEmployeeInfo(match);
              return;
            }
          }
        }

        throw new Error('Employee details record not found.');
      } catch (err) {
        console.error('Error fetching HOD employee profile:', err);
        setError(err.message || 'Failed to load employee profile details.');
      } finally {
        hasLoadedOnceRef.current = true;
        setLoading(false);
      }
    };

    fetchEmployeeProfile();
  }, [employeeIdentityKey, user?.email, user?.employee_details_id]);

  const handleRequestPasswordReset = () => {
    if (profileEmail) requestReset(profileEmail);
  };

  if (loading && !hasLoadedOnceRef.current) {
    return (
      <div className="hod-dashboard profile-page loading-state" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <i className="fa-solid fa-spinner fa-spin fa-3x" style={{ color: '#2563eb', marginBottom: '16px' }} />
          <p style={{ marginTop: '12px', fontSize: '1.1rem', fontWeight: '500' }}>Loading your profile details...</p>
        </div>
      </div>
    );
  }

  if (error || !employeeInfo) {
    return (
      <div className="hod-dashboard profile-page error-state" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#ef4444', maxWidth: '400px', padding: '24px' }}>
          <i className="fa-solid fa-triangle-exclamation fa-3x" style={{ marginBottom: '16px' }} />
          <p style={{ marginTop: '12px', fontSize: '1.1rem', fontWeight: '500' }}>
            {error || 'Unable to retrieve your employee profile. Please try logging in again.'}
          </p>
          <button onClick={() => window.location.reload()} className="outline-btn" style={{ marginTop: '16px', borderColor: '#ef4444', color: '#ef4444' }}>
            <i className="fa-solid fa-arrows-rotate" style={{ marginRight: '8px' }}></i> Retry
          </button>
        </div>
      </div>
    );
  }

  // Construct dynamic personal info list from employeeDetails record
  const displayDepartment = hasDepartmentScope
    ? (activeDepartment?.name
      || assignedDepartments[0]?.name
      || employeeInfo.department?.name
      || 'Not assigned')
    : (employeeInfo.department?.name || 'Not assigned');

  const heroSubtitle = hasDepartmentScope
    ? displayDepartment
    : (employeeInfo.department?.name || 'Administrative Staff');

  const personalInfo = [
    { label: 'Full Name', value: employeeInfo.name },
    { label: 'Email Address', value: employeeInfo.email },
    { label: 'Mobile Number', value: employeeInfo.mobile_number || 'Not specified' },
    { label: hasDepartmentScope && assignedDepartments.length > 1 ? 'Active Department' : 'Department', value: displayDepartment },
  ];

  if (hasDepartmentScope && assignedDepartments.length > 1) {
    personalInfo.push({
      label: 'All Assigned Departments',
      value: assignedDepartments.map((dept) => dept.name).join(', '),
    });
  }

  personalInfo.push({ label: 'Account Role', value: employeeInfo.role?.name || 'HOD' });

  // Dynamic Avatar Initial
  const avatarInitial = employeeInfo.name ? employeeInfo.name.charAt(0).toUpperCase() : 'H';

  return (
    <div className="hod-dashboard profile-page">
      <header className="profile-header">
        <h1>My Profile</h1>
        <p>Manage your administrative profile and account settings.</p>
      </header>

      <section className="profile-hero-card dashboard-card">
        <div className="profile-hero-content">
          <div className="profile-avatar-wrapper">
            <div className="profile-hero-avatar">{avatarInitial}</div>
            <button className="avatar-edit-btn">
              <i className="fa-solid fa-camera"></i>
            </button>
          </div>
          
          <div className="profile-hero-info">
            <div className="name-row">
              <h2>{employeeInfo.name}</h2>
              <span className="role-badge">{employeeInfo.role?.name || 'HOD'}</span>
            </div>
            <p className="dept-text">{heroSubtitle}</p>
            <p className="univ-text">Grievance Portal Administrator</p>
            
            <div className="contact-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              <span>
                <i className="fa-regular fa-envelope"></i>
                {employeeInfo.email}
              </span>
              {employeeInfo.mobile_number && (
                <span>
                  <i className="fa-solid fa-phone"></i>
                  {employeeInfo.mobile_number}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <button className="edit-profile-btn" onClick={() => setEditModalOpen(true)}>
          <i className="fa-solid fa-pen"></i>
          Edit Profile
        </button>
      </section>

      <div className="profile-main-grid">
        <section className="dashboard-card personal-info-card">
          <div className="card-head">
            <h3>Personal Information</h3>
          </div>
          <div className="info-list">
            {personalInfo.map((info) => (
              <div key={info.label} className="info-item">
                <span className="info-label">{info.label}</span>
                <span className="info-value">{info.value}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="profile-side-col">
          <section className="dashboard-card settings-card">
            <div className="card-head">
              <h3>Account Settings</h3>
            </div>
            <div className="settings-list">
              <PasswordResetSection
                variant="embedded"
                email={profileEmail}
                sending={resetSending}
                message={resetMessage}
                error={resetError}
                onRequestReset={handleRequestPasswordReset}
                buttonLabel="Change Password"
              />
              <div className="setting-item">
                <div className="setting-label">
                  <span>Language</span>
                </div>
                <div className="select-wrapper">
                  <select defaultValue="English">
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                  </select>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <EditHODProfileModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        employeeInfo={employeeInfo}
        onSaveSuccess={async () => {
          const updatedProfile = await masterApis.getEmployeeDetailsById(employeeInfo.id);
          if (updatedProfile && updatedProfile.success && updatedProfile.data) {
            setEmployeeInfo(updatedProfile.data);
          }
        }}
      />
    </div>
  );
};

export default MyProfile;
