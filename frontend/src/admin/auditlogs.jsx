import React, { useState, useEffect } from 'react';
import '../styles/admin/auditlogs.css';

import { auditLogApis } from '../services/api/api';
import PaginationPageNumbers from '../components/UI/PaginationPageNumbers';

// Helper to generate avatar initials and color from name
const getAvatarInfo = (name) => {
  if (!name) return { avatar: 'U', color: 'bg-blue' };
  const parts = name.split(' ');
  const avatar = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  
  const colors = ['bg-blue', 'bg-purple', 'bg-orange', 'bg-teal', 'bg-rose'];
  const charCode = name.charCodeAt(0) || 0;
  const color = colors[charCode % colors.length];
  
  return { avatar, color };
};


const AuditLogs = () => {
  // 1. Data States
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. Filter States
  const [filters, setFilters] = useState({
    dateRange: 'All Dates',
    filterDate: '',
    startTime: '',
    endTime: '',
    admin: 'All Admins',
    action: 'All Actions',
    entityType: 'All Entities'
  });

  // 3. Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const totalPages = Math.ceil(totalItems / limit) || 1;

  // 4. Sort States
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');

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

  // 4. Data Fetching Effect
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await auditLogApis.getAllAuditLogs(filters, page, limit, sortField, sortOrder);
        
        // Transform backend data to match frontend expectations
        const formattedData = response.data.map(log => {
          const actorName = log.actor?.name || 'Unknown User';
          const avatarInfo = getAvatarInfo(actorName);
          
          return {
            id: `#${log.id}`,
            actor: {
              name: actorName,
              email: log.actor?.email || 'N/A',
              avatar: avatarInfo.avatar,
              color: avatarInfo.color
            },
            action: log.action,
            entityType: log.entity_type,
            metadata: log.metadata,
            timestamp: new Date(log.createdAt).toLocaleString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })
          };
        });

        setLogs(formattedData);
        setTotalItems(response.total);
      } catch (err) {
        setError('Failed to fetch audit logs.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [filters, page, limit, sortField, sortOrder]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page on filter change
  };

  const resetFilters = () => {
    setFilters({
      dateRange: 'All Dates',
      filterDate: '',
      startTime: '',
      endTime: '',
      admin: 'All Admins',
      action: 'All Actions',
      entityType: 'All Entities'
    });
    setPage(1);
  };

  const getActionClass = (action) => {
    switch (action) {
      case 'CREATE': return 'al-action-create';
      case 'UPDATE': return 'al-action-update';
      case 'DELETE': return 'al-action-delete';
      default: return '';
    }
  };

  return (
    <div className="al-page">
      <div className="al-header">
        <h1 className="al-title">Audit Logs</h1>
        <p className="al-subtitle">Track and review all actions performed in the system.</p>
      </div>

      <div className="al-filter-panel">
        {/* Date Range Filter */}
        <div className="al-filter-group">
          <label>Date Range</label>
          <div className="al-select-wrapper" style={{position: 'relative'}}>
            <select 
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10}}
            >
              <option value="All Dates">All Dates</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="Specific Date">Specific Date</option>
              <option value="Specific Time Range">Specific Time Range</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
            </select>
            <div className="al-select-content">
              <i className="fa-regular fa-calendar al-select-icon"></i>
              {filters.dateRange}
            </div>
            <i className="fa-solid fa-chevron-down al-select-chevron"></i>
          </div>
        </div>

        {/* Conditional Date Picker for Specific Date / Specific Time Range */}
        {(filters.dateRange === 'Specific Date' || filters.dateRange === 'Specific Time Range') && (
          <div className="al-filter-group">
            <label>Select Date</label>
            <div className="al-input-wrapper">
              <input 
                type="date" 
                className="al-input-control"
                value={filters.filterDate}
                onChange={(e) => handleFilterChange('filterDate', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Conditional Time Pickers for Specific Time Range */}
        {filters.dateRange === 'Specific Time Range' && (
          <>
            <div className="al-filter-group">
              <label>Start Time</label>
              <div className="al-input-wrapper">
                <input 
                  type="time" 
                  className="al-input-control"
                  value={filters.startTime}
                  onChange={(e) => handleFilterChange('startTime', e.target.value)}
                />
              </div>
            </div>
            <div className="al-filter-group">
              <label>End Time</label>
              <div className="al-input-wrapper">
                <input 
                  type="time" 
                  className="al-input-control"
                  value={filters.endTime}
                  onChange={(e) => handleFilterChange('endTime', e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {/* Admin Filter */}
        <div className="al-filter-group">
          <label>Admin / Actor</label>
          <div className="al-select-wrapper" style={{position: 'relative'}}>
            <select 
              value={filters.admin}
              onChange={(e) => handleFilterChange('admin', e.target.value)}
              style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10}}
            >
              <option value="All Admins">All Admins</option>
              <option value="Ananya Sharma">Ananya Sharma</option>
              <option value="Rahul Verma">Rahul Verma</option>
              <option value="Priya Desai">Priya Desai</option>
              <option value="Amit Singh">Amit Singh</option>
              <option value="Sneha Patil">Sneha Patil</option>
            </select>
            <div className="al-select-content">
              <i className="fa-regular fa-user al-select-icon"></i>
              {filters.admin}
            </div>
            <i className="fa-solid fa-chevron-down al-select-chevron"></i>
          </div>
        </div>

        {/* Action Filter */}
        <div className="al-filter-group">
          <label>Action</label>
          <div className="al-select-wrapper" style={{position: 'relative'}}>
            <select 
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10}}
            >
              <option value="All Actions">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
            <div className="al-select-content">
              <i className="fa-solid fa-bolt-lightning al-select-icon"></i>
              {filters.action}
            </div>
            <i className="fa-solid fa-chevron-down al-select-chevron"></i>
          </div>
        </div>

        {/* Entity Type Filter */}
        <div className="al-filter-group">
          <label>Entity Type</label>
          <div className="al-select-wrapper" style={{position: 'relative'}}>
            <select 
              value={filters.entityType}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
              style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10}}
            >
              <option value="All Entities">All Entities</option>
              <option value="User">User</option>
              <option value="Grievance">Grievance</option>
              <option value="Category">Category</option>
              <option value="Assignment">Assignment</option>
            </select>
            <div className="al-select-content">
              <i className="fa-solid fa-layer-group al-select-icon"></i>
              {filters.entityType}
            </div>
            <i className="fa-solid fa-chevron-down al-select-chevron"></i>
          </div>
        </div>

        <button className="al-reset-btn" onClick={resetFilters} style={{marginLeft: 'auto'}}>
          <i className="fa-solid fa-rotate-right"></i>
          Reset
        </button>
      </div>

      <div className="al-table-panel">
        <div className="al-table-container">
          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
              <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: '8px' }}></i>
              Loading logs...
            </div>
          ) : error ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#dc3545' }}>{error}</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>No logs found matching your filters.</div>
          ) : (
            <table className="al-table">
              <thead>
                <tr>
                  <th>
                    <button type="button" className={`table-header-sort-btn ${sortField === 'id' ? 'active' : ''}`} onClick={() => handleSort('id')}>
                      <span>ID</span>
                      <SortIcon field="id" />
                    </button>
                  </th>
                  <th>Admin / Actor</th>
                  <th>
                    <button type="button" className={`table-header-sort-btn ${sortField === 'action' ? 'active' : ''}`} onClick={() => handleSort('action')}>
                      <span>Action</span>
                      <SortIcon field="action" />
                    </button>
                  </th>
                  <th>
                    <button type="button" className={`table-header-sort-btn ${sortField === 'entity_type' ? 'active' : ''}`} onClick={() => handleSort('entity_type')}>
                      <span>Entity Type</span>
                      <SortIcon field="entity_type" />
                    </button>
                  </th>
                  <th>Metadata</th>
                  <th>
                    <button type="button" className={`table-header-sort-btn ${sortField === 'createdAt' ? 'active' : ''}`} onClick={() => handleSort('createdAt')}>
                      <span>Date & Time</span>
                      <SortIcon field="createdAt" />
                    </button>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="al-id-cell">{log.id}</td>
                    <td>
                      <div className="al-actor-cell">
                        <div className={`al-avatar ${log.actor.color}`}>
                          {log.actor.avatar}
                        </div>
                        <div className="al-actor-info">
                          <span className="al-actor-name">{log.actor.name}</span>
                          <span className="al-actor-email">{log.actor.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`al-action-badge ${getActionClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.entityType}</td>
                    <td>
                      <div className="al-metadata" title={log.metadata}>
                        {log.metadata}
                      </div>
                    </td>
                    <td>{log.timestamp}</td>
                    <td>
                      <button className="al-view-btn">
                        <i className="fa-regular fa-eye"></i>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="al-footer">
          <div className="al-results-info">
            Showing {totalItems === 0 ? 0 : ((page - 1) * limit) + 1} to {Math.min(page * limit, totalItems)} of {totalItems} entries
          </div>

          <div className="al-pagination">
            <button 
              className={`al-page-btn ${page === 1 ? 'disabled' : ''}`}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            
            <PaginationPageNumbers
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              buttonClassName="al-page-btn"
            />

            <button 
              className={`al-page-btn ${page === totalPages || totalPages === 0 ? 'disabled' : ''}`}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          <div className="al-rows-selector">
            <span>Rows per page</span>
            <select 
              value={limit} 
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
