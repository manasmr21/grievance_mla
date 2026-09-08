import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useDebounce from '../hooks/useDebounce';
import '../styles/admin/Dashboard.css';
import '../styles/admin/ManageGrievances.css';
import GrievanceTable from '../components/grievance/GrievanceTable';
import PaginationPageNumbers from '../components/UI/PaginationPageNumbers';
import PaginationFooter from '../components/UI/PaginationFooter';
import { grievanceApi, masterApis } from '../services/api/api';
import { getInitials, formatDate } from '../utils/formatters';
import { getStatusTone, getPriorityTone } from '../utils/grievanceBadges';

const toneColors = ['slate', 'purple', 'cyan', 'pink', 'amber', 'green', 'red', 'blue'];

const statusTabs = [
  { key: 'All', label: 'All Grievances' },
  { key: 'Pending', label: 'Pending' },
  { key: 'In Progress', label: 'In Progress' },
  { key: 'Resolved', label: 'Resolved' },
];

const ManageGrievances = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [status, setStatus] = useState('All');
  const [category, setCategory] = useState('All Categories');
  const [subCategory, setSubCategory] = useState('All Sub-categories');
  const [priority, setPriority] = useState('All Priorities');
  const [sortField, setSortField] = useState('submittedOn');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);

  const [grievancesRaw, setGrievancesRaw] = useState([]);
  const [categoriesArray, setCategoriesArray] = useState([]);
  const [subCategoriesArray, setSubCategoriesArray] = useState([]);
  const [statusArray, setStatusArray] = useState([]);
  const [prioritiesArray, setPrioritiesArray] = useState([]);
  const [employeesArray, setEmployeesArray] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState({ All: 0, Pending: 0, 'In Progress': 0, Resolved: 0 });

  // Fetch metadata once on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [catRes, subCatRes, statRes, prioRes, empRes] = await Promise.all([
          masterApis.getAllCategories(),
          masterApis.getAllSubCategories(),
          masterApis.getTicketStatus(),
          masterApis.getTicketPriorities(),
          masterApis.getEmployeeDetails(),
        ]);
        setCategoriesArray(catRes.data || []);
        setSubCategoriesArray(subCatRes.data || []);
        setStatusArray(statRes.data || []);
        setPrioritiesArray(prioRes.data || []);
        setEmployeesArray(empRes.data || []);
      } catch (error) {
        console.error('Error fetching metadata:', error);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch grievances when page/filters change
  const fetchGrievances = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { page, limit: rowsPerPage, search: debouncedSearch, status, category, subCategory, priority, sortField, sortOrder };
      const res = await grievanceApi.getAllGrievances(params);
      if (res && res.success) {
        setGrievancesRaw(res.data || []);
        setTotalCount(res.count || 0);
        if (res.statusCounts) setStatusCounts(res.statusCounts);
      }
    } catch (error) {
      console.error('Error fetching grievances:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, rowsPerPage, debouncedSearch, status, category, subCategory, priority, sortField, sortOrder]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchGrievances();
  }, [fetchGrievances]);

  // Transform API data into table rows
  const grievanceRows = useMemo(() => {
    return grievancesRaw.map((g, idx) => {
      const complainantName = g.full_name || '—';
      const complainantMobile = g.mobile_number || '—';
      const categoryName = g.category?.name || '—';
      const subCategoryName = g.subCategory?.name || '—';
      const priorityName = g.priority?.name || '—';
      const statusName = g.status?.name || '—';
      const assignedEmps = Array.isArray(g.assignedEmployees) ? g.assignedEmployees : [];
      const hasAssignees = assignedEmps.length > 0;

      return {
        id: g.public_ticket_no || g.id,
        raw: g,
        complainant: complainantName,
        complainantMobile,
        category: categoryName,
        subCategory: subCategoryName,
        priority: priorityName,
        status: statusName,
        assignedTo: hasAssignees
          ? {
              name: assignedEmps.map(emp => emp.name).join(', '),
              subtitle: assignedEmps.map(emp => emp.role?.name || 'Staff').join(', '),
              avatar: getInitials(assignedEmps[0].name),
              tone: toneColors[idx % toneColors.length],
            }
          : {
              name: 'Unassigned',
              subtitle: '',
              avatar: '—',
              tone: 'slate',
            },
        submittedOn: formatDate(g.createdAt),
      };
    });
  }, [grievancesRaw]);

  const effectivePage = page;
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage) || 1);
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + grievancesRaw.length;
  const paged = grievanceRows;

  const tabCounts = statusCounts;

  const handleSort = (key) => {
    if (sortField === key) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(key);
      setSortOrder('ASC');
    }
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('All');
    setCategory('All Categories');
    setSubCategory('All Sub-categories');
    setPriority('All Priorities');
    setSortField('submittedOn');
    setSortOrder('DESC');
    setPage(1);
  };

  const setTab = (key) => {
    setStatus(key);
    setPage(1);
  };

  return (
    <div className="mg-page">
      <div className="mg-hero">
        <div className="mg-hero-copy">
          <h1 className="mg-title">Manage Grievances</h1>
          <p className="mg-subtitle">View, filter, assign and track all grievances across the system.</p>
        </div>
      </div>

      <section className="mg-panel">
        <div className="mg-filterbar">

          <div className="mg-filter-grid">
            <label className="mg-filter">
              <span>Status</span>
              <select value={status} onChange={(e) => setTab(e.target.value)}>
                <option value="All">All Status</option>
                {statusArray.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </label>

            <label className="mg-filter">
              <span>Category</span>
              <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
                <option>All Categories</option>
                {categoriesArray.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </label>

            <label className="mg-filter">
              <span>Sub-category</span>
              <select value={subCategory} onChange={(e) => { setSubCategory(e.target.value); setPage(1); }}>
                <option>All Sub-categories</option>
                {subCategoriesArray.map((sc) => (
                  <option key={sc.id} value={sc.name}>{sc.name}</option>
                ))}
              </select>
            </label>

            <label className="mg-filter">
              <span>Priority</span>
              <select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
                <option>All Priorities</option>
                {prioritiesArray.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </label>

            <button className="mg-link" type="button" onClick={clearFilters}>
              <i className="fa-solid fa-rotate-right" />
              Clear Filters
            </button>
          </div>
        </div>
        <GrievanceTable
          columns={[
            {
              label: 'Ticket ID',
              key: 'id',
              sortable: true,
              render: (item) => <span className="mg-ticket">{item.id}</span>,
              className: 'ticket-id-cell'
            },
            { label: 'Complainant', key: 'complainant', sortable: true, render: (item) => (
              <div>
                <div>{item.complainant}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{item.complainantMobile}</div>
              </div>
            ) },
            { label: 'Category', key: 'category', sortable: true },
            { label: 'Sub-category', key: 'subCategory', sortable: true },
            {
              label: 'Priority',
              key: 'priority',
              sortable: true,
              render: (item) => (
                <span className={`table-status ${getPriorityTone(item.priority)}`}>{item.priority}</span>
              )
            },
            {
              label: 'Status',
              key: 'status',
              sortable: true,
              render: (item) => (
                <span className={`table-status ${getStatusTone(item.status)}`}>{item.status}</span>
              )
            },
            {
              label: 'Assigned To',
              key: 'assignedTo',
              render: (item) => {
                if (item.assignedTo.name === 'Unassigned') {
                  return (
                    <AssignDropdown
                      grievanceId={item.raw.id}
                      employees={employeesArray}
                      onAssigned={fetchGrievances}
                    />
                  );
                }
                return (
                  <div className="mg-assignee">
                    <div className={`mg-avatar mg-avatar-${item.assignedTo.tone}`}>{item.assignedTo.avatar}</div>
                    <div className="mg-assignee-copy">
                      <div className="mg-assignee-name">{item.assignedTo.name}</div>
                      <div className="mg-assignee-sub">{item.assignedTo.subtitle}</div>
                    </div>
                  </div>
                );
              }
            },
            {
              label: 'Submitted On',
              key: 'submittedOn',
              sortable: true,
              render: (item) => (
                <span className="mg-date">
                  {item.submittedOn.split('\n').map((line, idx) => (
                    <span key={idx}>
                      {line}
                      {idx === 0 && <br />}
                    </span>
                  ))}
                </span>
              )
            },
            {
              label: 'Actions',
              key: 'actions',
              render: (item) => (
                <div className="mg-col-actions">
                  <button
                    className="mg-icon-btn"
                    type="button"
                    aria-label="View"
                    title="View Details"
                    onClick={() => navigate(`/admin/grievances/${item.raw.id}`)}
                  >
                    <i className="fa-regular fa-eye" />
                  </button>
                  <button className="mg-icon-btn mg-icon-btn--more" type="button" aria-label="More">
                    <i className="fa-solid fa-ellipsis-vertical" />
                  </button>
                </div>
              )
            }
          ]}
          data={paged}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          isLoading={isLoading}
        />

        <div className="mg-footer">
          <div className="mg-results">Showing {totalCount === 0 ? 0 : startIndex + 1} to {endIndex} of {totalCount} entries</div>

          <div className="mg-pagination">
            <button
              type="button"
              className="mg-page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={effectivePage <= 1}
              aria-label="Previous"
            >
              <i className="fa-solid fa-chevron-left" />
            </button>

            <PaginationPageNumbers
              page={effectivePage}
              totalPages={totalPages}
              onPageChange={setPage}
              buttonClassName="mg-page-btn"
              activeClassName="mg-page-active"
            />

            <button
              type="button"
              className="mg-page-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={effectivePage >= totalPages || totalCount === 0}
              aria-label="Next"
            >
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>

          <div className="mg-rows">
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
    </div>
  );
};

/* ─── Assign Dropdown ───────────────────────────────────────────── */

const BLOCKED_ROLE_KEYWORDS = ['student', 'admin'];

const isAssignableEmployee = (emp) => {
  const roleName = (emp.role?.name || '').toLowerCase();
  const roleCode = (emp.role?.code || '').toLowerCase();
  return !BLOCKED_ROLE_KEYWORDS.some((kw) => roleName.includes(kw) || roleCode.includes(kw));
};

const AssignDropdown = ({ grievanceId, employees, onAssigned }) => {
  const [selectedId, setSelectedId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState('');

  const assignableEmployees = employees.filter(isAssignableEmployee);

  const handleAssign = async () => {
    if (!selectedId) return;
    setIsAssigning(true);
    setError('');
    try {
      const res = await grievanceApi.assignGrievance(grievanceId, [selectedId]);
      if (res && res.success) {
        onAssigned();
      } else {
        setError(res?.message || 'Assignment failed');
      }
    } catch (err) {
      setError(err.message || 'Assignment failed');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="mg-assign-wrap">
      <select
        className="mg-assign-select"
        value={selectedId}
        onChange={(e) => { setSelectedId(e.target.value); setError(''); }}
        disabled={isAssigning}
      >
        <option value="">Select employee…</option>
        {assignableEmployees.map((emp) => (
          <option key={emp.id} value={emp.id}>
            {emp.name}{emp.role?.name ? ` · ${emp.role.name}` : ''}
          </option>
        ))}
      </select>
      <button
        className={`mg-assign-btn${isAssigning ? ' mg-assign-btn--loading' : ''}${!selectedId ? ' mg-assign-btn--hidden' : ''}`}
        type="button"
        disabled={!selectedId || isAssigning}
        onClick={handleAssign}
        title="Assign"
      >
        {isAssigning
          ? <i className="fa-solid fa-circle-notch fa-spin" />
          : <i className="fa-solid fa-check" />}
      </button>
      {error && <span className="mg-assign-error">{error}</span>}
    </div>
  );
};

export default ManageGrievances;
