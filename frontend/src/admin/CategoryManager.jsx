import React, { useMemo, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import '../styles/admin/AdminShared.css';
import { masterApis } from '../services/api/api';
import { fetchTypesThunk, addTypeThunk, updateTypeThunk, deleteTypeThunk } from '../store/slices/typesSlice';
import ConfirmModal from '../components/UI/ConfirmModal';
import DebouncedSearchInput from '../components/UI/DebouncedSearchInput';
import PaginationPageNumbers from '../components/UI/PaginationPageNumbers';
import useDebouncedSearchFetch, { isAbortError } from '../hooks/useDebouncedSearchFetch';



const availableIcons = [
  'fa-solid fa-shield-halved',
  'fa-regular fa-building',
  'fa-solid fa-graduation-cap',
  'fa-regular fa-file-lines',
  'fa-solid fa-book-open',
  'fa-solid fa-car-side',
  'fa-solid fa-table-cells-large'
];

const availableColors = [
  'blue', 'green', 'purple', 'amber', 'red', 'teal', 'slate'
];


const CategoryManager = () => {
  const dispatch = useDispatch();
  const { typesArray, totalTypes, totalPages: typeTotalPages, loading: typesLoading } = useSelector((state) => state.types);
  const [categories, setCategories] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // Types state
  const [typePage, setTypePage] = useState(1);
  const [typeLimit, setTypeLimit] = useState(5); // Show 5 types per page in modal
  const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [isEditTypeModalOpen, setIsEditTypeModalOpen] = useState(false);
  const [isAddSubModalOpen, setIsAddSubModalOpen] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(availableIcons[0]);
  const [selectedColor, setSelectedColor] = useState(availableColors[0]);
  const [editingSub, setEditingSub] = useState(null);
  const [subCategories, setSubCategories] = useState([]);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [editingCat, setEditingCat] = useState(null);

  // Subcategory pagination states
  const [subPage, setSubPage] = useState(1);
  const [subLimit, setSubLimit] = useState(10);
  const [totalSubCategories, setTotalSubCategories] = useState(0);
  const [totalSubPages, setTotalSubPages] = useState(1);

  // Subcategory sort states (client-side)
  const [subSortField, setSubSortField] = useState('name');
  const [subSortOrder, setSubSortOrder] = useState('ASC');

  // Category sidebar search (server-side)
  const {
    debouncedSearch: debouncedCatSearch,
    handleSearchChange: handleCatSearchChange,
    abortSearch: abortCatSearch,
    createFetchController: createCatController,
  } = useDebouncedSearchFetch();

  // Subcategory table search (server-side)
  const {
    debouncedSearch: debouncedSubSearch,
    handleSearchChange: handleSubSearchChange,
    abortSearch: abortSubSearch,
    createFetchController: createSubController,
  } = useDebouncedSearchFetch({ onPageReset: () => setSubPage(1) });

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', entityName: undefined, onConfirm: null, confirmLabel: 'Delete', variant: 'danger', showWarning: undefined });
  const showConfirm = (opts) => setConfirmModal({ isOpen: true, confirmLabel: 'Delete', variant: 'danger', entityName: undefined, showWarning: undefined, ...opts });
  const closeConfirm = () => setConfirmModal((prev) => ({ ...prev, isOpen: false }));

  const handleSubSort = (field) => {
    if (subSortField === field) {
      setSubSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSubSortField(field);
      setSubSortOrder('ASC');
    }
  };

  const SubSortIcon = ({ field }) => {
    const isActive = subSortField === field;
    return (
      <span className="sort-arrows-icon">
        {isActive ? (
          subSortOrder === 'ASC' ? (
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

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchSubCategories = async (categoryId, page, limit) => {
    if (!categoryId) {
      setSubCategories([]);
      setTotalSubCategories(0);
      setTotalSubPages(1);
      return;
    }
    const controller = createSubController();
    try {
      const res = await masterApis.getSubCategoryByCategoryId(categoryId, page, limit, debouncedSubSearch, { signal: controller.signal });
      const data = res?.data || [];
      setSubCategories(data);
      setTotalSubCategories(res?.total !== undefined ? res.total : data.length);
      setTotalSubPages(res?.totalPages !== undefined ? res.totalPages : 1);
    } catch (error) {
      if (isAbortError(error)) return;
      console.error("Error fetching subcategories:", error);
    }
  };

  const refreshData = async () => {
    const controller = createCatController();
    try {
      const response = await masterApis.getAllCategories(undefined, undefined, undefined, undefined, debouncedCatSearch, { signal: controller.signal });
      const categoriesData = response?.data || response || [];
      if (Array.isArray(categoriesData)) {
        const formattedData = categoriesData.map(cat => ({
          ...cat,
          subCategories: cat.subCategories || [],
          subCategoriesCount: cat.subCategoriesCount !== undefined ? cat.subCategoriesCount : (cat.subCategories ? cat.subCategories.length : 0),
          icon: cat.icon || { className: 'fa-regular fa-folder', tone: 'blue' }
        }));

        const misc = [];
        const nonMisc = [];
        formattedData.forEach(c => {
          const nameLower = c.name ? c.name.toLowerCase().trim() : '';
          if (nameLower === 'miscellaneous') {
            misc.push(c);
          } else {
            nonMisc.push(c);
          }
        });
        const finalCategories = [...nonMisc, ...misc];
        setCategories(finalCategories);

        setSelectedId(current => {
          let nextId = current;
          if (finalCategories.length > 0 && !current) {
            nextId = finalCategories[0].id;
          } else if (current && !finalCategories.find(c => c.id === current)) {
            nextId = finalCategories.length > 0 ? finalCategories[0].id : null;
          }
          return nextId;
        });
      }
    } catch (error) {
      if (isAbortError(error)) return;
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    refreshData();
  }, [debouncedCatSearch]);

  useEffect(() => {
    fetchSubCategories(selectedId, subPage, subLimit);
  }, [selectedId, subPage, subLimit, debouncedSubSearch]);

  // Fetch grievance types
  useEffect(() => {
    dispatch(fetchTypesThunk({ page: typePage, limit: typeLimit }));
  }, [dispatch, typePage, typeLimit]);

  const openEditModal = (sub) => {
    setEditingSub({ ...sub, icon: sub.icon || { className: availableIcons[0], tone: availableColors[0] } });
  };

  // Types handlers
  const handleDeleteType = (id) => {
    showConfirm({
      title: 'Delete Type',
      message: 'Are you sure you want to delete this type?',
      confirmLabel: 'Delete Type',
      onConfirm: async () => {
        await dispatch(deleteTypeThunk(id)).unwrap();
        alert('Type deleted successfully');
        dispatch(fetchTypesThunk({ page: typePage, limit: typeLimit }));
        closeConfirm();
      },
    });
  };

  const handleToggleSubcategoryStatus = async (sub) => {
    try {
      await masterApis.updateSubCategory(sub.id, { is_active: !sub.is_active });
      fetchSubCategories(selectedId, subPage, subLimit);
    } catch (error) {
      alert(error.message || 'Error updating subcategory status');
    }
  };

  const handlePermanentDeleteSubcategory = (sub) => {
    showConfirm({
      title: 'Delete Subcategory',
      message: 'Are you sure you want to permanently delete',
      entityName: sub.name,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        const response = await masterApis.permanentDeleteSubCategory(sub.id);
        alert(response.message || 'Subcategory permanently deleted');
        refreshData();
        fetchSubCategories(selectedId, subPage, subLimit);
        closeConfirm();
      },
    });
  };

  const handleDeleteCategory = (id) => {
    showConfirm({
      title: 'Permanently Delete Category',
      message: 'Are you sure you want to PERMANENTLY delete this category? This action cannot be undone.',
      confirmLabel: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await masterApis.permanentDeleteCategory(id);
          alert(response.message || 'Category permanently deleted successfully');
          refreshData();
        } catch (err) {
          alert(err.message || 'Error permanently deleting category');
        }
        closeConfirm();
      },
    });
  };

  const handleToggleCategoryStatus = async (cat) => {
    try {
      if (cat.is_active !== false) {
        await masterApis.deleteCategory(cat.id);
      } else {
        await masterApis.updateCategory(cat.id, { is_active: true });
      }
      refreshData();
    } catch (error) {
      alert(error.message || 'Error toggling category status');
    }
  };

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedId) || categories[0],
    [categories, selectedId]
  );

  // Type dropdown filter is still client-side (cosmetic filter on top of server results)
  const filteredCategories = useMemo(() => {
    let list = categories;
    if (selectedTypeFilter !== 'ALL') {
      list = categories.filter((c) => Number(c.type_id) === Number(selectedTypeFilter));
    }
    const misc = [];
    const nonMisc = [];
    list.forEach(c => {
      const nameLower = c.name ? c.name.toLowerCase().trim() : '';
      if (nameLower === 'miscellaneous') {
        misc.push(c);
      } else {
        nonMisc.push(c);
      }
    });
    return [...nonMisc, ...misc];
  }, [categories, selectedTypeFilter]);

  // Client-side sort only (search is server-side)
  const sortedSubCategories = useMemo(() => {
    const result = subCategories ? [...subCategories] : [];
    result.sort((a, b) => {
      let aVal = a[subSortField] ?? '';
      let bVal = b[subSortField] ?? '';
      if (typeof aVal === 'boolean') aVal = aVal ? 1 : 0;
      if (typeof bVal === 'boolean') bVal = bVal ? 1 : 0;
      if (aVal < bVal) return subSortOrder === 'ASC' ? -1 : 1;
      if (aVal > bVal) return subSortOrder === 'ASC' ? 1 : -1;
      return 0;
    });

    const others = [];
    const rest = [];
    result.forEach(sub => {
      const nameLower = sub.name ? sub.name.toLowerCase().trim() : '';
      if (nameLower === 'others' || nameLower === 'other') {
        others.push(sub);
      } else {
        rest.push(sub);
      }
    });
    return [...rest, ...others];
  }, [subCategories, subSortField, subSortOrder]);

  return (
    <div className="cm-page">
      <div className="cm-hero">
        <div className="cm-hero-text">
          <h1 className="cm-title">Category Management</h1>
          <p className="cm-subtitle">Create and manage categories and their subcategories.</p>
        </div>
        <div className="cm-actions-header-group" style={{ display: 'flex', gap: '12px' }}>
          <button className="cm-btn cm-btn-outline" type="button" onClick={() => setIsManageTypesOpen(true)}>
            <i className="fa-solid fa-gears" />
            Manage Types
          </button>
          <button className="cm-btn cm-btn-primary" type="button" onClick={() => setIsAddModalOpen(true)}>
            <i className="fa-solid fa-plus" />
            Add Category
          </button>
        </div>
      </div>

      <div className="cm-grid">
        {/* Sidebar - Categories */}
        <div className="cm-sidebar-panel">
          <h2 className="cm-panel-title">Categories</h2>
          <DebouncedSearchInput
            placeholder="Search categories..."
            onDebouncedChange={handleCatSearchChange}
            onTyping={abortCatSearch}
            className="cm-search-box"
          />

          <div className="cm-filter-box" style={{ marginBottom: '16px' }}>
            <select
              className="cm-select-alt"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#334155', outline: 'none' }}
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
            >
              <option value="ALL">All Types</option>
              {typesArray && typesArray.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="cm-category-list">
            {filteredCategories.map((cat) => {
              const isActive = cat.id === selectedId;
              return (
                <div
                  key={cat.id}
                  className={`cm-category-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedId(cat.id);
                    setSubPage(1);
                  }}
                >
                  <div className={`cm-cat-icon tone-${cat.icon.tone}`}>
                    <i className={cat.icon.className}></i>
                  </div>
                  <div className="cm-cat-info">
                    <span className="cm-cat-name">{cat.name}</span>
                    <span className="cm-cat-count">{cat.subCategoriesCount} Subcategories</span>
                  </div>
                  <div className={`cm-cat-menu-container ${openDropdownId === cat.id ? 'dropdown-open' : ''}`}>
                    <button
                      className="cm-cat-menu-btn"
                      aria-label="More options"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(openDropdownId === cat.id ? null : cat.id);
                      }}
                    >
                      <i className="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                    {openDropdownId === cat.id && (
                      <div className="cm-dropdown-menu">
                        <button className="cm-dropdown-item" onClick={(e) => {
                          e.stopPropagation();
                          setEditingCat(cat);
                          setOpenDropdownId(null);
                        }}>
                          <i className="fa-solid fa-pen"></i> Edit
                        </button>
                        <button className="cm-dropdown-item" onClick={(e) => {
                          e.stopPropagation();
                          handleToggleCategoryStatus(cat);
                          setOpenDropdownId(null);
                        }}>
                          <i className={`fa-solid ${cat.is_active !== false ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                          {cat.is_active !== false ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="cm-dropdown-item delete" onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(cat.id);
                          setOpenDropdownId(null);
                        }}>
                          <i className="fa-regular fa-trash-can"></i> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button className="cm-btn cm-btn-outline cm-btn-full" type="button" onClick={() => setIsAddModalOpen(true)}>
            <i className="fa-solid fa-plus" />
            Add Category
          </button>
        </div>

        {/* Main Content - Subcategories */}
        <div className="cm-main-panel">
          <div className="cm-main-header">
            <h2 className="cm-panel-title">
              Subcategories of <span className="cm-text-blue">{selectedCategory?.name}</span>
            </h2>
          </div>

          <div className="cm-main-toolbar">
            <DebouncedSearchInput
              placeholder="Search subcategories..."
              onDebouncedChange={handleSubSearchChange}
              onTyping={abortSubSearch}
            />
            <button className="cm-btn cm-btn-primary" type="button" onClick={() => setIsAddSubModalOpen(true)}>
              <i className="fa-solid fa-plus" />
              Add Subcategory
            </button>
          </div>

          <div className="cm-table-container">
            <table className="cm-table">
              <thead>
                <tr>
                  <th>
                    <button type="button" className={`table-header-sort-btn ${subSortField === 'name' ? 'active' : ''}`} onClick={() => handleSubSort('name')}>
                      <span>Subcategory Name</span>
                      <SubSortIcon field="name" />
                    </button>
                  </th>
                  <th>
                    <button type="button" className={`table-header-sort-btn ${subSortField === 'is_active' ? 'active' : ''}`} onClick={() => handleSubSort('is_active')}>
                      <span>Status</span>
                      <SubSortIcon field="is_active" />
                    </button>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedSubCategories.length > 0 ? (
                  sortedSubCategories.map((sub) => (
                    <tr key={sub.id}>
                      <td data-label="Subcategory Name">
                        <div className="cm-subcat-name-cell">
                          {sub.icon && (
                            <div className={`cm-subcat-icon tone-${sub.icon.tone}`}>
                              <i className={sub.icon.className}></i>
                            </div>
                          )}
                          <span>{sub.name}</span>
                        </div>
                      </td>
                      <td data-label="Status">
                        <div className="cm-status-toggle-wrap" onClick={() => handleToggleSubcategoryStatus(sub)} title={sub.is_active ? 'Click to deactivate' : 'Click to activate'}>
                          <div className={`cm-toggle-switch ${sub.is_active ? 'on' : 'off'}`}>
                            <div className="cm-toggle-knob" />
                          </div>
                          <span className={`cm-status-pill ${sub.is_active ? 'active' : 'inactive'}`}>
                            {sub.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td data-label="Actions">
                        <div className="cm-actions-group">
                          <button className="cm-action-btn edit-btn" aria-label="Edit" onClick={() => openEditModal(sub)}>
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button className="cm-action-btn delete-btn" aria-label="Permanently Delete" onClick={() => handlePermanentDeleteSubcategory(sub)}>
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="cm-empty-state">No subcategories found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="cm-pagination">
            <div className="cm-page-info">
              Showing {totalSubCategories === 0 ? 0 : (subPage - 1) * subLimit + 1} to {Math.min(subPage * subLimit, totalSubCategories)} of {totalSubCategories} subcategories
            </div>
            <div className="cm-page-controls">
              <button
                className="cm-page-btn"
                onClick={() => setSubPage((p) => Math.max(1, p - 1))}
                disabled={subPage <= 1}
                aria-label="Previous page"
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              
              <PaginationPageNumbers
                page={subPage}
                totalPages={totalSubPages}
                onPageChange={setSubPage}
                buttonClassName="cm-page-btn"
              />
              
              <button
                className="cm-page-btn"
                onClick={() => setSubPage((p) => Math.min(totalSubPages, p + 1))}
                disabled={subPage >= totalSubPages}
                aria-label="Next page"
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Category Modal */}
      <AddCategoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={refreshData}
      />

      {/* Add Subcategory Modal */}
      <AddSubcategoryModal
        isOpen={isAddSubModalOpen}
        onClose={() => setIsAddSubModalOpen(false)}
        selectedCategory={selectedCategory}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        categories={categories}
        onSuccess={() => {
          refreshData();
          fetchSubCategories(selectedId, subPage, subLimit);
        }}
      />

      {/* Edit Subcategory Modal */}
      <EditSubcategoryModal
        editingSub={editingSub}
        setEditingSub={setEditingSub}
        onSuccess={() => {
          refreshData();
          fetchSubCategories(selectedId, subPage, subLimit);
        }}
      />

      {/* Edit Category Modal */}
      <EditCategoryModal
        editingCat={editingCat}
        setEditingCat={setEditingCat}
        onSuccess={refreshData}
      />

      {/* Manage Types Modal */}
      <ManageTypesModal
        isOpen={isManageTypesOpen}
        onClose={() => {
          setIsManageTypesOpen(false);
          refreshData(); // Refresh in case types change
        }}
        showConfirm={showConfirm}
        closeConfirm={closeConfirm}
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
        hideSubtitle={confirmModal.hideSubtitle}
      />
    </div>
  );
};

export default CategoryManager;


function AddSubcategoryModal({
  isOpen,
  onClose,
  selectedCategory,
  selectedId,
  setSelectedId,
  categories,
  onSuccess
}) {
  if (!isOpen) return null;

  const [subCategories, setSubCategories] = useState({
    name: "",
    categoryId: null,
    code: "",
    status: true
  })
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createSubCategories } = masterApis;

  const handleAddSubcategory = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...subCategories,
        category_id: selectedId,
      };
      const response = await createSubCategories(payload);
      alert(response.message);
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      alert(error.message || "Error creating subcategory");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cm-modal-overlay">
      <div className="cm-modal">
        <div className="cm-modal-header">
          <div>
            <h3 className="cm-modal-title">Add Subcategory</h3>
            <p className="cm-modal-subtitle">Create a new subcategory for {selectedCategory?.name}.</p>
          </div>
          <button className="cm-modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="cm-modal-body">
          <div className="cm-form-group">
            <label>Subcategory Name <span className="cm-required">*</span></label>
            <input
              type="text"
              placeholder="Enter subcategory name"
              value={subCategories.name}
              onChange={(e) => setSubCategories({ ...subCategories, name: e.target.value })}
            />
          </div>

          <div className="cm-form-group">
            <label>Category <span className="cm-required">*</span></label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>


          <div className="cm-form-group">
            <label>Subcategory Code <span className="cm-required">*</span></label>
            <input
              type="text"
              className='uppercase'
              placeholder="Enter subcategory code"
              value={subCategories.code}
              onChange={(e) => setSubCategories({ ...subCategories, code: e.target.value.toUpperCase() })}
            />
          </div>

          {/* <div className="cm-form-group">
            <label>Description</label>
            <textarea
              placeholder="Enter subcategory description (optional)"
              value={newSubDesc}
              onChange={(e) => setNewSubDesc(e.target.value)}
            ></textarea>
          </div> */}

          {/* <div className="cm-form-group">
            <label>Icon</label>
            <div className="cm-icon-picker">
              {availableIcons.map((icon) => (
                <button 
                  key={icon}
                  className={`cm - icon - option ${ selectedIcon === icon ? 'active' : '' } `} 
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                >
                  <i className={icon}></i>
                </button>
              ))}
            </div>
          </div>
          
          <div className="cm-form-group">
            <label>Color</label>
            <div className="cm-color-picker">
              {availableColors.map((color) => (
                <button 
                  key={color}
                  className={`cm - color - option bg - color - ${ color } ${ selectedColor === color ? 'active' : '' } `} 
                  type="button"
                  onClick={() => setSelectedColor(color)}
                ></button>
              ))}
            </div>
          </div> */}
        </div>

        <div className="cm-modal-footer">
          <button className="cm-btn cm-btn-cancel" type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button
            className="cm-btn cm-btn-primary"
            type="button"
            onClick={handleAddSubcategory}
            disabled={isSubmitting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {isSubmitting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" />
                <span>Adding...</span>
              </>
            ) : (
              'Add Subcategory'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddCategoryModal({
  isOpen,
  onClose,
  onSuccess
}) {
  if (!isOpen) return null;
  const { typesArray } = useSelector((state) => state.types);
  const [categoryData, setCategoryData] = useState({
    name: "",
    code: "",
    type_id: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && typesArray.length > 0 && !categoryData.type_id) {
      setCategoryData(prev => ({ ...prev, type_id: typesArray[0].id }));
    }
  }, [isOpen, typesArray]);

  const { createCategories } = masterApis;

  const handleAddCategory = async () => {
    setIsSubmitting(true);
    try {
      if (!categoryData.type_id) {
        alert("Please select a category type");
        setIsSubmitting(false);
        return;
      }
      const response = await createCategories({
        ...categoryData,
        type_id: Number(categoryData.type_id)
      });
      alert(response.message);
      onClose();
      // Reset state
      setCategoryData({ name: "", code: "", type_id: typesArray[0]?.id || "" });
      if (onSuccess) onSuccess();
    } catch (error) {
      alert(error.message || "Error creating category");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="cm-modal-overlay">
      <div className="cm-modal">
        <div className="cm-modal-header">
          <div>
            <h3 className="cm-modal-title">Add Category</h3>
            <p className="cm-modal-subtitle">Create a new category to organize grievances better.</p>
          </div>
          <button className="cm-modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="cm-modal-body">
          <div className="cm-form-group">
            <label>Category Name <span className="cm-required">*</span></label>
            <input
              type="text"
              placeholder="Enter category name"
              value={categoryData.name}
              onChange={(e) => setCategoryData({ ...categoryData, name: e.target.value })}
            />
          </div>

          <div className="cm-form-group ">
            <label>Category Code <span className="cm-required">*</span></label>
            <input
              type="text"
              className='uppercase'
              placeholder="Enter category code, must be unique"
              value={categoryData.code}
              onChange={(e) => setCategoryData({ ...categoryData, code: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="cm-form-group">
            <label>Category Type <span className="cm-required">*</span></label>
            <select
              value={categoryData.type_id}
              onChange={(e) => setCategoryData({ ...categoryData, type_id: e.target.value })}
              required
            >
              <option value="">Select Type</option>
              {typesArray.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* <div className="cm-form-group">
            <label>Description</label>
            <textarea
              placeholder="Enter category description (optional)"
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
            ></textarea>
          </div> */}

          {/* <div className="cm-form-group">
            <label>Icon</label>
            <div className="cm-icon-picker">
              {availableIcons.map((icon) => (
                <button
                  key={icon}
                  className={`cm - icon - option ${ selectedIcon === icon ? 'active' : '' } `}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                >
                  <i className={icon}></i>
                </button>
              ))}
            </div>
          </div>

          <div className="cm-form-group">
            <label>Color</label>
            <div className="cm-color-picker">
              {availableColors.map((color) => (
                <button
                  key={color}
                  className={`cm - color - option bg - color - ${ color } ${ selectedColor === color ? 'active' : '' } `}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                ></button>
              ))}
            </div>
          </div> */}
        </div>

         <div className="cm-modal-footer">
          <button className="cm-btn cm-btn-cancel" type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button
            className="cm-btn cm-btn-primary"
            type="button"
            onClick={handleAddCategory}
            disabled={isSubmitting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {isSubmitting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" />
                <span>Adding...</span>
              </>
            ) : (
              'Add Category'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditSubcategoryModal({
  editingSub,
  setEditingSub,
  onSuccess
}) {
  if (!editingSub) return null;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditSubcategory = async () => {
    setIsSubmitting(true);
    try {
      const { updateSubCategory } = masterApis;
      const response = await updateSubCategory(editingSub.id, {
        name: editingSub.name,
        code: editingSub.code,
      });
      alert(response.message || "Subcategory updated successfully");
      setEditingSub(null);
      if (onSuccess) onSuccess();
    } catch (error) {
      alert(error.message || "Error updating subcategory");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cm-modal-overlay">
      <div className="cm-modal">
        <div className="cm-modal-header">
          <div>
            <h3 className="cm-modal-title">Edit Subcategory</h3>
            <p className="cm-modal-subtitle">Update the details of the selected subcategory.</p>
          </div>
          <button className="cm-modal-close" onClick={() => setEditingSub(null)}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="cm-modal-body">
          <div className="cm-form-group">
            <label>Subcategory Name <span className="cm-required">*</span></label>
            <input
              type="text"
              placeholder="Enter subcategory name"
              value={editingSub.name}
              onChange={(e) => setEditingSub({ ...editingSub, name: e.target.value })}
            />
          </div>

          <div className="cm-form-group">
            <label>Subcategory Code <span className="cm-required">*</span></label>
            <input
              type="text"
              className="uppercase"
              placeholder="Enter subcategory code"
              value={editingSub.code || ''}
              onChange={(e) => setEditingSub({ ...editingSub, code: e.target.value.toUpperCase() })}
            />
          </div>
        </div>

        <div className="cm-modal-footer">
          <button className="cm-btn cm-btn-cancel" type="button" onClick={() => setEditingSub(null)} disabled={isSubmitting}>Cancel</button>
          <button
            className="cm-btn cm-btn-primary"
            type="button"
            onClick={handleEditSubcategory}
            disabled={isSubmitting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {isSubmitting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" />
                <span>Saving...</span>
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditCategoryModal({
  editingCat,
  setEditingCat,
  onSuccess
}) {
  if (!editingCat) return null;
  const { typesArray } = useSelector((state) => state.types);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditCategory = async () => {
    setIsSubmitting(true);
    try {
      const { updateCategory } = masterApis;
      if (!updateCategory) {
        alert("updateCategory API not available.");
        return;
      }
      if (!editingCat.type_id) {
        alert("Please select a category type");
        return;
      }
      const response = await updateCategory(editingCat.id, {
        name: editingCat.name,
        code: editingCat.code,
        type_id: Number(editingCat.type_id)
      });
      alert(response.message || "Category updated successfully");
      setEditingCat(null);
      if (onSuccess) onSuccess();
    } catch (error) {
      alert(error.message || "Error updating category");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cm-modal-overlay">
      <div className="cm-modal">
        <div className="cm-modal-header">
          <div>
            <h3 className="cm-modal-title">Edit Category</h3>
            <p className="cm-modal-subtitle">Update the details of the selected category.</p>
          </div>
          <button className="cm-modal-close" onClick={() => setEditingCat(null)}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="cm-modal-body">
          <div className="cm-form-group">
            <label>Category Name <span className="cm-required">*</span></label>
            <input
              type="text"
              placeholder="Enter category name"
              value={editingCat.name}
              onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
            />
          </div>

          <div className="cm-form-group">
            <label>Category Code <span className="cm-required">*</span></label>
            <input
              type="text"
              className='uppercase'
              placeholder="Enter category code"
              value={editingCat.code}
              onChange={(e) => setEditingCat({ ...editingCat, code: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="cm-form-group">
            <label>Category Type <span className="cm-required">*</span></label>
            <select
              value={editingCat.type_id || ""}
              onChange={(e) => setEditingCat({ ...editingCat, type_id: e.target.value })}
              required
            >
              <option value="">Select Type</option>
              {typesArray.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

         <div className="cm-modal-footer">
          <button className="cm-btn cm-btn-cancel" type="button" onClick={() => setEditingCat(null)} disabled={isSubmitting}>Cancel</button>
          <button
            className="cm-btn cm-btn-primary"
            type="button"
            onClick={handleEditCategory}
            disabled={isSubmitting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {isSubmitting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" />
                <span>Saving...</span>
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ManageTypesModal({ isOpen, onClose, showConfirm, closeConfirm }) {
  if (!isOpen) return null;

  const dispatch = useDispatch();
  const { typesArray, totalTypes, totalPages, loading } = useSelector((state) => state.types);

  const [page, setPage] = useState(1);
  const limit = 5;

  const [typeName, setTypeName] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchTypesThunk({ page, limit }));
  }, [dispatch, page]);

  const handleAddOrUpdate = async (e) => {
    e.preventDefault();
    if (!typeName.trim() || !typeCode.trim()) {
      alert('Name and code are required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await dispatch(updateTypeThunk({
          id: editingId,
          data: { name: typeName.trim(), code: typeCode.trim().toUpperCase() }
        })).unwrap();
        alert('Type updated successfully');
      } else {
        await dispatch(addTypeThunk({
          name: typeName.trim(),
          code: typeCode.trim().toUpperCase()
        })).unwrap();
        alert('Type created successfully');
      }
      setTypeName('');
      setTypeCode('');
      setEditingId(null);
      dispatch(fetchTypesThunk({ page, limit }));
    } catch (err) {
      alert(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (type) => {
    setEditingId(type.id);
    setTypeName(type.name);
    setTypeCode(type.code);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTypeName('');
    setTypeCode('');
  };

  const handleDelete = (id) => {
    showConfirm({
      title: 'Permanently Delete Type',
      message: 'Are you sure you want to PERMANENTLY delete this type? This action cannot be undone.',
      confirmLabel: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await masterApis.permanentDeleteType(id);
          alert('Type permanently deleted successfully');
          dispatch(fetchTypesThunk({ page, limit }));
        } catch (err) {
          alert(err.message || 'Error permanently deleting type');
        }
        closeConfirm();
      },
    });
  };

  return (
    <div className="cm-modal-overlay">
      <div className="cm-modal" style={{ maxWidth: '650px' }}>
        <div className="cm-modal-header">
          <div>
            <h3 className="cm-modal-title">Manage Grievance Types</h3>
            <p className="cm-modal-subtitle">Add, edit, or delete top-level grievance types.</p>
          </div>
          <button className="cm-modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="cm-modal-body" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          {/* List of Types */}
          <div className="cm-types-list-section" style={{ borderRight: '1px solid #e2e8f0', paddingRight: '20px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>Existing Types</h4>
            {loading ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#64748b' }}>
                <i className="fa-solid fa-spinner fa-spin" /> Loading...
              </div>
            ) : typesArray.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No types found.</p>
            ) : (
              <div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
                  {typesArray.map((type) => (
                    <li
                      key={type.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        backgroundColor: editingId === type.id ? '#f0fdf4' : '#fff'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '0.9rem', color: '#0f172a' }}>{type.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Code: {type.code}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleEdit(type)}
                          style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '4px' }}
                          title="Edit type"
                        >
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(type.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          title="Delete type"
                        >
                          <i className="fa-regular fa-trash-can" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Types pagination */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      className="cm-page-btn"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      style={{ padding: '4px 8px' }}
                      type="button"
                    >
                      <i className="fa-solid fa-chevron-left" />
                    </button>
                    <span style={{ fontSize: '0.8rem', color: '#475569' }}>Page {page} of {totalPages}</span>
                    <button
                      className="cm-page-btn"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      style={{ padding: '4px 8px' }}
                      type="button"
                    >
                      <i className="fa-solid fa-chevron-right" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Add/Edit Form */}
          <form onSubmit={handleAddOrUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
              {editingId ? 'Edit Type' : 'Add New Type'}
            </h4>
            <div className="cm-form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '500', color: '#475569' }}>Type Name *</label>
              <input
                type="text"
                placeholder="e.g. Academic"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                required
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              />
            </div>
            <div className="cm-form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '500', color: '#475569' }}>Type Code *</label>
              <input
                type="text"
                placeholder="e.g. ACADEMIC"
                className="uppercase"
                value={typeCode}
                onChange={(e) => setTypeCode(e.target.value)}
                required
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              {editingId && (
                <button
                  className="cm-btn cm-btn-cancel"
                  type="button"
                  onClick={handleCancelEdit}
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
              )}
              <button
                className="cm-btn cm-btn-primary"
                type="submit"
                disabled={isSubmitting}
                style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  editingId ? 'Save Changes' : 'Add Type'
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="cm-modal-footer">
          <button className="cm-btn cm-btn-cancel" type="button" onClick={onClose} disabled={isSubmitting}>Close</button>
        </div>
      </div>
    </div>
  );
}