import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiDownload,
  FiFileText,
  FiRefreshCw,
  FiFilter,
  FiBarChart2,
} from 'react-icons/fi';
import PaginationPageNumbers from '../components/UI/PaginationPageNumbers';
import { masterApis, reportsApi } from '../services/api/api';
import '../styles/admin/Reports.css';

const PAGE_SIZE = 5;

const DEFAULT_FILTERS = {
  viewBy: 'all',
  department: 'All',
  startDate: '',
  endDate: '',
  category: 'All',
  subCategory: 'All',
};

const buildApiParams = (filters) => {
  const params = { viewBy: filters.viewBy || 'all' };
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.viewBy === 'department' && filters.department && filters.department !== 'All') {
    params.department = filters.department;
  }
  if (filters.category && filters.category !== 'All') params.category = filters.category;
  if (filters.subCategory && filters.subCategory !== 'All') params.subCategory = filters.subCategory;
  return params;
};

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/** Excel-friendly CSV export (opens cleanly in Excel). */
const exportTableToExcel = (headers, rows, filename) => {
  const escapeCell = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ];
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const stamp = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `${filename}-${stamp}.csv`);
};

const paginate = (rows, page) => {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const slice = rows.slice(start, start + PAGE_SIZE);
  const from = total === 0 ? 0 : start + 1;
  const to = Math.min(start + PAGE_SIZE, total);
  return { slice, total, totalPages, safePage, from, to };
};

const Pagination = ({ page, total, totalPages, from, to, onChange }) => (
  <div className="gsr-pagination">
    <span className="gsr-page-info">
      Showing {from} to {to} of {total} entries
    </span>
    {totalPages > 1 && (
      <div className="gsr-page-btns">
        <button
          type="button"
          className="gsr-page-btn"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <i className="fa-solid fa-chevron-left" />
        </button>
        <PaginationPageNumbers
          page={page}
          totalPages={totalPages}
          onPageChange={onChange}
          buttonClassName="gsr-page-btn"
          activeClassName="active"
        />
        <button
          type="button"
          className="gsr-page-btn"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <i className="fa-solid fa-chevron-right" />
        </button>
      </div>
    )}
  </div>
);

const TableCardHead = ({ icon: Icon, title, onExport, exportDisabled, extraActions = null }) => (
  <div className="gsr-card-head">
    <div className="gsr-card-head-left">
      <Icon />
      <h2>{title}</h2>
    </div>
    <div className="gsr-card-head-actions">
      {extraActions}
      <button
        type="button"
        className="gsr-btn gsr-btn-excel gsr-btn-table-export"
        onClick={onExport}
        disabled={exportDisabled}
        title="Export this table to Excel"
      >
        <FiDownload />
        Export Excel
      </button>
    </div>
  </div>
);

const AdminReports = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState('');
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [subCategories, setSubCategories] = useState([]);
  const [page1, setPage1] = useState(1);

  const fetchStats = useCallback(async (activeFilters) => {
    setLoading(true);
    setError('');
    try {
      const res = await reportsApi.getAdminStats(buildApiParams(activeFilters));
      if (res?.success) {
        setStats(res.data);
        setAppliedFilters(activeFilters);
        setDraftFilters(activeFilters);
        setPage1(1);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load report statistics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(DEFAULT_FILTERS);
  }, [fetchStats]);

  useEffect(() => {
    let cancelled = false;
    const loadSubs = async () => {
      if (!draftFilters.category || draftFilters.category === 'All') {
        setSubCategories([]);
        return;
      }
      try {
        const res = await masterApis.getSubCategoryByCategoryId(
          draftFilters.category,
          1,
          200,
        );
        const rows = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.rows)
            ? res.rows
            : Array.isArray(res)
              ? res
              : [];
        if (!cancelled) setSubCategories(rows);
      } catch {
        if (!cancelled) setSubCategories([]);
      }
    };
    loadSubs();
    return () => {
      cancelled = true;
    };
  }, [draftFilters.category]);

  const handleViewByChange = (viewBy) => {
    setDraftFilters((f) => ({
      ...f,
      viewBy,
      department: 'All',
      category: 'All',
      subCategory: 'All',
    }));
  };

  const handleApply = (e) => {
    e?.preventDefault();
    fetchStats(draftFilters);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    fetchStats(DEFAULT_FILTERS);
  };

  const handleDownload = async (format) => {
    setDownloading(format);
    setError('');
    try {
      const response = await reportsApi.downloadAdminReport(format, buildApiParams(appliedFilters));
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      const today = new Date().toISOString().slice(0, 10);
      triggerDownload(response.data, `grievance-report-${today}.${ext}`);
    } catch (err) {
      setError(err?.message || `Failed to download ${format} report.`);
    } finally {
      setDownloading(null);
    }
  };

  const viewBy = appliedFilters.viewBy || 'all';
  const departments = stats?.departments || [];
  const categories = stats?.categories || [];

  const categoryRows = useMemo(() => stats?.categoryBreakdown || [], [stats]);
  const departmentRows = useMemo(() => stats?.departmentRows || [], [stats]);

  const primaryRows = viewBy === 'all' ? categoryRows : departmentRows;

  const primaryPage = paginate(primaryRows, page1);

  const filterCategories = draftFilters.viewBy === appliedFilters.viewBy
    ? categories
    : categories;

  const exportCategoryTable = () => {
    exportTableToExcel(
      ['Category Name', 'Type', 'Responsible', 'Assigned Staff', 'Total Grievances', 'Under Review', 'Resolved', 'Pending'],
      categoryRows.map((row) => [
        row.name,
        row.typeName || row.typeCode || '-',
        row.responsible,
        row.assignedCount ?? 0,
        row.total,
        row.underReview,
        row.resolved,
        row.pending,
      ]),
      'category-wise-grievance-report',
    );
  };

  const exportDepartmentGrievanceTable = () => {
    exportTableToExcel(
      ['Department Name', 'Total Grievances', 'Under Review', 'Resolved', 'Reopened'],
      departmentRows.map((row) => [
        row.name,
        row.total,
        row.underReview,
        row.resolved,
        row.reopened,
      ]),
      'department-wise-grievance-report',
    );
  };

  return (
    <div className="gsr-page">
      <div className="gsr-hero">
        <div>
          <h1 className="gsr-title">Grievance Report</h1>
          <p className="gsr-subtitle">
            Filter by All or Department — then dates, category, and subcategory
          </p>
        </div>
        <div className="gsr-header-actions">
          <button
            type="button"
            className="gsr-btn gsr-btn-ghost"
            onClick={() => fetchStats(appliedFilters)}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'gsr-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            className="gsr-btn gsr-btn-excel"
            onClick={() => handleDownload('excel')}
            disabled={!!downloading || loading}
          >
            <FiDownload />
            {downloading === 'excel' ? 'Generating…' : 'Download Excel'}
          </button>
          <button
            type="button"
            className="gsr-btn gsr-btn-pdf"
            onClick={() => handleDownload('pdf')}
            disabled={!!downloading || loading}
          >
            <FiFileText />
            {downloading === 'pdf' ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {error && <div className="gsr-error">{error}</div>}

      <section className="gsr-card">
        <div className="gsr-card-head">
          <FiFilter />
          <h2>Filters</h2>
        </div>
        <form className="gsr-filters" onSubmit={handleApply}>
          <div className="gsr-filter">
            <label htmlFor="gsr-view-by">
              View By <span className="gsr-req">*</span>
            </label>
            <select
              id="gsr-view-by"
              value={draftFilters.viewBy}
              onChange={(e) => handleViewByChange(e.target.value)}
            >
              <option value="all">All</option>
              <option value="department">Department</option>
            </select>
          </div>

          {draftFilters.viewBy === 'department' && (
            <div className="gsr-filter">
              <label htmlFor="gsr-department">
                Select Department <span className="gsr-req">*</span>
              </label>
              <select
                id="gsr-department"
                value={draftFilters.department}
                onChange={(e) => setDraftFilters((f) => ({ ...f, department: e.target.value }))}
              >
                <option value="All">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={String(d.id)}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="gsr-filter">
            <label htmlFor="gsr-from">
              From Date <span className="gsr-req">*</span>
            </label>
            <input
              id="gsr-from"
              type="date"
              value={draftFilters.startDate}
              onChange={(e) => setDraftFilters((f) => ({ ...f, startDate: e.target.value }))}
            />
          </div>

          <div className="gsr-filter">
            <label htmlFor="gsr-to">
              To Date <span className="gsr-req">*</span>
            </label>
            <input
              id="gsr-to"
              type="date"
              value={draftFilters.endDate}
              min={draftFilters.startDate || undefined}
              onChange={(e) => setDraftFilters((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>

          <div className="gsr-filter">
            <label htmlFor="gsr-category">Category</label>
            <select
              id="gsr-category"
              value={draftFilters.category}
              onChange={(e) => setDraftFilters((f) => ({
                ...f,
                category: e.target.value,
                subCategory: 'All',
              }))}
            >
              <option value="All">All Categories</option>
              {filterCategories.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="gsr-filter">
            <label htmlFor="gsr-subcategory">Subcategory</label>
            <select
              id="gsr-subcategory"
              value={draftFilters.subCategory}
              disabled={!draftFilters.category || draftFilters.category === 'All'}
              onChange={(e) => setDraftFilters((f) => ({ ...f, subCategory: e.target.value }))}
            >
              <option value="All">All Subcategories</option>
              {subCategories.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="gsr-filter gsr-filter-actions">
            <label>&nbsp;</label>
            <div className="gsr-action-row">
              <button type="submit" className="gsr-btn gsr-btn-primary" disabled={loading}>
                <FiFilter />
                Filter Report
              </button>
              <button
                type="button"
                className="gsr-btn gsr-btn-ghost"
                onClick={clearFilters}
                disabled={loading}
              >
                Clear
              </button>
            </div>
          </div>
        </form>
      </section>

      {loading ? (
        <div className="gsr-loading">
          <div className="gsr-spinner" />
          <p>Loading report…</p>
        </div>
      ) : (
        <>
          {viewBy === 'all' && (
            <section className="gsr-card">
              <TableCardHead
                icon={FiBarChart2}
                title="Grievance Report Table (Category Wise)"
                onExport={exportCategoryTable}
                exportDisabled={!categoryRows.length}
              />
              <div className="gsr-table-wrap">
                <table className="gsr-table">
                  <thead>
                    <tr>
                      <th>Category Name</th>
                      <th>Type</th>
                      <th>Responsible</th>
                      <th>Assigned Staff</th>
                      <th>Total Grievances</th>
                      <th>Under Review</th>
                      <th>Resolved</th>
                      <th>Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {primaryPage.slice.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="gsr-empty">No grievance data for the selected filters.</td>
                      </tr>
                    ) : (
                      primaryPage.slice.map((row) => (
                        <tr key={row.id}>
                          <td className="gsr-name">{row.name}</td>
                          <td>{row.typeName || row.typeCode || '-'}</td>
                          <td>{row.responsible}</td>
                          <td>{row.assignedCount ?? 0}</td>
                          <td><span className="gsr-num gsr-num-blue">{row.total}</span></td>
                          <td><span className="gsr-num gsr-num-orange">{row.underReview}</span></td>
                          <td><span className="gsr-num gsr-num-green">{row.resolved}</span></td>
                          <td><span className="gsr-num gsr-num-orange">{row.pending}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={primaryPage.safePage}
                total={primaryPage.total}
                totalPages={primaryPage.totalPages}
                from={primaryPage.from}
                to={primaryPage.to}
                onChange={setPage1}
              />
            </section>
          )}

          {viewBy === 'department' && (
            <section className="gsr-card">
              <TableCardHead
                icon={FiBarChart2}
                title="Grievance Report Table (Department Wise)"
                onExport={exportDepartmentGrievanceTable}
                exportDisabled={!departmentRows.length}
              />
              <div className="gsr-table-wrap">
                <table className="gsr-table">
                  <thead>
                    <tr>
                      <th>Department Name</th>
                      <th>Total Grievances</th>
                      <th>Under Review</th>
                      <th>Resolved</th>
                      <th>Reopened</th>
                    </tr>
                  </thead>
                  <tbody>
                    {primaryPage.slice.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="gsr-empty">No department grievance data.</td>
                      </tr>
                    ) : (
                      primaryPage.slice.map((row) => (
                        <tr key={row.id}>
                          <td className="gsr-name">{row.name}</td>
                          <td><span className="gsr-num gsr-num-blue">{row.total}</span></td>
                          <td><span className="gsr-num gsr-num-orange">{row.underReview}</span></td>
                          <td><span className="gsr-num gsr-num-green">{row.resolved}</span></td>
                          <td><span className="gsr-num gsr-num-red">{row.reopened}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={primaryPage.safePage}
                total={primaryPage.total}
                totalPages={primaryPage.totalPages}
                from={primaryPage.from}
                to={primaryPage.to}
                onChange={setPage1}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default AdminReports;
