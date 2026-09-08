import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/hod/MyAssigned.css';
import GrievanceTable from '../components/grievance/GrievanceTable';
import { useAuth } from '../hooks/useAuth';
import { grievanceApi, masterApis } from '../services/api/api';
import useDebounce from '../hooks/useDebounce';
import { isDepartmentScopedRole } from '../utils/departmentAuth';
import PaginationPageNumbers from '../components/UI/PaginationPageNumbers';
const ALL_MY_DEPARTMENTS = 'All my departments';

const MyAssigned = () => {
  const navigate = useNavigate();
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
  
  const [grievances, setGrievances] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [statusesList, setStatusesList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [prioritiesList, setPrioritiesList] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  // Filter and pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [priorityFilter, setPriorityFilter] = useState('All Priorities');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [departmentFilter, setDepartmentFilter] = useState(
    () => (activeDepartment?.id ? String(activeDepartment.id) : 'All Departments'),
  );
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [totalCount, setTotalCount] = useState(0);

  // Fetch metadata once on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [
          categoriesRes,
          statusesRes,
          departmentsRes,
          prioritiesRes
        ] = await Promise.all([
          masterApis.getAllCategories(),
          masterApis.getTicketStatus(),
          hasDepartmentScope && assignedDepartments.length > 0
            ? Promise.resolve(null)
            : masterApis.getDepartments(),
          masterApis.getTicketPriorities()
        ]);

        if (categoriesRes && categoriesRes.success && categoriesRes.data) {
          setCategoriesList(categoriesRes.data.filter(c => c.is_active));
        }
        if (statusesRes && statusesRes.success && statusesRes.data) {
          setStatusesList(statusesRes.data.filter(s => s.is_active));
        }
        if (hasDepartmentScope && assignedDepartments.length > 0) {
          setDepartmentsList(assignedDepartments);
        } else if (departmentsRes && departmentsRes.success && departmentsRes.data) {
          setDepartmentsList(departmentsRes.data.filter(d => d.is_active));
        }
        if (prioritiesRes && prioritiesRes.success && prioritiesRes.data) {
          setPrioritiesList(prioritiesRes.data.filter(p => p.is_active));
        }
      } catch (error) {
        console.error('Error fetching metadata:', error);
      }
    };
    fetchMetadata();
  }, [hasDepartmentScope, assignedDepartments]);

  useEffect(() => {
    if (activeDepartment?.id) {
      setDepartmentFilter(String(activeDepartment.id));
      setCurrentPage(1);
    }
  }, [activeDepartment?.id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Fetch grievances on change of page or filters
  useEffect(() => {
    const fetchGrievances = async () => {
      const activeRoleId = activeRole?.id || user?.role_id;
      if (!activeRoleId) {
        setInitialLoading(false);
        return;
      }

      const isFirstLoad = !hasLoadedOnceRef.current;
      if (isFirstLoad) {
        setInitialLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const params = {
          page: currentPage,
          limit: itemsPerPage,
          search: debouncedSearch,
          status: statusFilter,
          category: categoryFilter,
          priority: priorityFilter,
          department: departmentFilter === ALL_MY_DEPARTMENTS
            ? 'All Departments'
            : departmentFilter,
          sortField,
          sortOrder,
        };
        const res = user?.employee_details_id
          ? await grievanceApi.getGrievancesByEmployeeId(user.employee_details_id, params)
          : await grievanceApi.getGrievancesByRoleId(activeRoleId, params);
        
        if (res && res.success) {
          setGrievances(res.data || []);
          setTotalCount(res.count || 0);
        }
      } catch (error) {
        console.error('Error fetching assigned grievances:', error);
      } finally {
        hasLoadedOnceRef.current = true;
        setInitialLoading(false);
        setIsRefreshing(false);
      }
    };
    fetchGrievances();
  }, [user?.employee_details_id, user?.role_id, activeRole?.id, currentPage, itemsPerPage, debouncedSearch, statusFilter, categoryFilter, priorityFilter, departmentFilter, sortField, sortOrder]);

  const formatDate = (dateString) => {
    if (!dateString) return { date: 'N/A', time: 'N/A' };
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return { date: 'N/A', time: 'N/A' };
    const dateOpt = { month: 'short', day: 'numeric', year: 'numeric' };
    const timeOpt = { hour: '2-digit', minute: '2-digit', hour12: true };
    return {
      date: d.toLocaleDateString('en-US', dateOpt),
      time: d.toLocaleTimeString('en-US', timeOpt)
    };
  };

  // Map department IDs to names
  const deptMap = {};
  departmentsList.forEach((d) => {
    deptMap[d.id] = d.name;
  });

  // Format grievances to table data
  const formattedGrievances = grievances.map((g) => {
    const assignedDate = formatDate(g.createdAt);
    const dueTimeStr = g.sla_due_at || new Date(new Date(g.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000);
    const dueByDate = formatDate(dueTimeStr);

    const isOverdue = !['RESOLVED', 'CLOSED', 'INACTIVE'].includes((g.status?.name || '').toUpperCase()) && 
                      new Date(dueTimeStr) < new Date();

    return {
      id: `#${g.public_ticket_no}`,
      student: g.full_name || g.student?.name || 'Anonymous',
      stuId: g.mobile_number || g.student?.phone_number || 'N/A',
      category: g.category?.name || 'Unknown',
      priority: g.priority?.name || 'Medium',
      status: g.status?.name || 'Pending',
      assignedOn: assignedDate.date,
      assignedTime: assignedDate.time,
      dueBy: dueByDate.date,
      dueTime: dueByDate.time,
      isOverdue,
      departmentName: deptMap[g.department] || 'General',
      raw: g
    };
  });

  // Since sorting and filtering are done server-side:
  const sortedData = formattedGrievances;

  const handleSort = (key) => {
    if (sortField === key) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(key);
      setSortOrder('ASC');
    }
    setCurrentPage(1);
  };

  // Pagination
  const totalItems = totalCount;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData;

  const clearFilters = () => {
    setSearchTerm('');
    setPriorityFilter('All Priorities');
    setCategoryFilter('All Categories');
    setStatusFilter('All Statuses');
    setDepartmentFilter(
      activeDepartment?.id
        ? String(activeDepartment.id)
        : (hasDepartmentScope && assignedDepartments.length > 1 ? ALL_MY_DEPARTMENTS : 'All Departments'),
    );
    setSortField('date');
    setSortOrder('DESC');
    setCurrentPage(1);
  };

  const handleExport = () => {
    // Generate CSV and download
    const headers = ['Ticket ID', 'Complainant', 'Mobile', 'Category', 'Priority', 'Status', 'Assigned On', 'Due By', 'Department'];
    const rows = formattedGrievances.map(g => [
      g.id,
      g.student,
      g.stuId,
      g.category,
      g.priority,
      g.status,
      `${g.assignedOn} ${g.assignedTime}`,
      `${g.dueBy} ${g.dueTime}`,
      g.departmentName
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `assigned_grievances_${user?.name?.replace(/\s+/g, '_') || 'Staff'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (initialLoading && !hasLoadedOnceRef.current) {
    return (
      <div className="hod-dashboard my-assigned-page" style={{ padding: '80px 40px', textAlign: 'center', color: '#64748b' }}>
        <i className="fa-solid fa-circle-notch fa-spin fa-3x" style={{ marginBottom: '20px', color: '#2563eb' }}></i>
        <h2 style={{ fontSize: '20px', color: '#1e293b', marginBottom: '8px' }}>Loading Assigned Grievances...</h2>
        <p>Please wait while we fetch and prepare the assigned cases.</p>
      </div>
    );
  }

  return (
    <div className="hod-dashboard my-assigned-page">
      <header className="page-header-alt">
        <div className="header-text">
          <h1>My Assigned</h1>
          <p>
            Grievances assigned to you
            {activeDepartment?.name ? ` for ${activeDepartment.name}` : ''}.
            View, update and resolve them.
            {isRefreshing && (
              <span style={{ marginLeft: '8px', color: '#64748b', fontSize: '0.9em' }}>
                <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" /> Updating…
              </span>
            )}
          </p>
        </div>
      </header>

      <section className="dashboard-card main-table-card">


        <div className="advanced-filter-bar">
          <div className="search-box-wrap">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input 
              type="text" 
              placeholder="Search by keyword..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-selects">
            <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}>
              <option>All Priorities</option>
              {prioritiesList.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
            <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}>
              <option>All Categories</option>
              {categoriesList.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
              <option>All Statuses</option>
              {statusesList.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
            <select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPage(1); }}>
              {hasDepartmentScope && assignedDepartments.length > 1 && (
                <option value={ALL_MY_DEPARTMENTS}>{ALL_MY_DEPARTMENTS}</option>
              )}
              {!hasDepartmentScope && (
                <option value="All Departments">All Departments</option>
              )}
              {departmentsList.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button className="clear-btn" onClick={clearFilters}>Clear</button>
          </div>
        </div>

        <GrievanceTable 
          columns={[
            { label: 'TICKET ID', key: 'id', className: 'id-cell-link', sortable: true },
            { 
              label: 'COMPLAINANT', 
              key: 'student',
              sortable: true,
              render: (item) => (
                <div className="student-cell-alt">
                  <div className="student-name">{item.student}</div>
                  <div className="student-id">{item.stuId}</div>
                </div>
              )
            },
            { label: 'CATEGORY', key: 'category', sortable: true },
            { 
              label: 'PRIORITY', 
              key: 'priority',
              sortable: true,
              render: (item) => (
                <span className={`table-status ${item.priority.toLowerCase()}`}>
                  {item.priority}
                </span>
              )
            },
            { 
              label: 'STATUS', 
              key: 'status',
              sortable: true,
              render: (item) => (
                <span className={`table-status ${item.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  {item.status}
                </span>
              )
            },
            { 
              label: 'ASSIGNED ON', 
              key: 'assignedOn',
              sortable: true,
              render: (item) => (
                <div className="date-cell">
                  <div>{item.assignedOn}</div>
                  <div className="time-sub">{item.assignedTime}</div>
                </div>
              )
            },
            { 
              label: 'DUE BY', 
              key: 'dueBy',
              sortable: true,
              render: (item) => (
                <div className={`date-cell ${item.isOverdue ? 'overdue-check' : ''}`}>
                  <div className="due-date">{item.dueBy}</div>
                  <div className="time-sub">{item.dueTime}</div>
                </div>
              )
            },
            { 
              label: 'ACTION', 
              key: 'action',
              render: (item) => (
                <div className="action-cell">
                  <button className="table-link-btn" onClick={() => navigate(`/staff/assigned/${item.raw?.id || item.id.replace('#', '')}`)}>Manage</button>
                  <button className="more-btn"><i className="fa-solid fa-ellipsis-vertical"></i></button>
                </div>
              )
            }
          ]}
          data={currentItems}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          isLoading={isRefreshing}
          emptyMessage="No grievances assigned to you match the selected criteria."
        />

        {totalItems > 0 && (
          <div className="table-footer-pagination">
            <div className="results-count">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalItems)} of {totalItems} results
            </div>
            <div className="pagination-controls">
              <button 
                className="page-nav" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <PaginationPageNumbers
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                buttonClassName="page-num"
              />
              <button 
                className="page-nav" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
            <div className="per-page-select">
              <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                <option value={5}>5 / page</option>
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default MyAssigned;
