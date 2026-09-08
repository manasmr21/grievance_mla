import { api, getApiError } from './axios.services';

const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:8080';

console.log("API Base URL:", baseUrl); // Debug log to verify the base URL being used

export const masterApis = {
    //roles
    getRoles: async (page, limit, search, { signal } = {}) => {
        try {
            const { data } = await api.get(`/roles`, {
                params: { page, limit, search: search || undefined },
                signal,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    getRolesForMenu: async (page, limit, search, { signal } = {}) => {
        try {
            const { data } = await api.get(`/roles/menu-assignments`, {
                params: { page, limit, search: search || undefined },
                signal,
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },


    getRolesById: async (id) => {
        try {
            const { data } = await api.get(`/roles/${id}`);
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    createRole: async (rolesData) => {
        try {
            const { data } = await api.post(`/roles/create`, rolesData, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    updateRole: async (id, rolesData) => {
        try {
            const { data } = await api.put(`/roles/update/${id}`, rolesData, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    deleteRole: async (id) => {
        try {
            const { data } = await api.delete(`/roles/${id}`, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    permanentDeleteRole: async (id) => {
        try {
            const { data } = await api.delete(`/roles/permanent/${id}`, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    // menus
    getMenus: async (page, limit, search, { signal } = {}) => {
        try {
            const { data } = await api.get('/menus', {
                params: {
                    page,
                    limit,
                    search: search || undefined,
                },
                withCredentials: true,
                signal,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    getMenuTree: async ({ signal } = {}) => {
        try {
            const { data } = await api.get('/menus/tree', {
                withCredentials: true,
                signal,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    createMenu: async (menuData) => {
        try {
            const { data } = await api.post('/menus', menuData, {
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    updateMenu: async (id, menuData) => {
        try {
            const { data } = await api.put(`/menus/${id}`, menuData, {
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    deleteMenu: async (id) => {
        try {
            const { data } = await api.delete(`/menus/${id}`, {
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    permanentDeleteMenu: async (id) => {
        try {
            const { data } = await api.delete(`/menus/${id}/permanent`, {
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    // grievance categories
    createCategories: async (categoryData) => {
        try {
            const { data } = await api.post("/grievance-category/create", categoryData, {
                withCredentials: true
            })
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    getAllCategories: async (page, limit, sortField, sortOrder, search, { signal } = {}) => {
        try {
            const { data } = await api.get("/grievance-category", {
                params: { page, limit, sortField, sortOrder, search: search || undefined },
                signal,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },
    // grievance types
    getTypes: async (page, limit, sortField, sortOrder) => {
        try {
            const { data } = await api.get(`/grievance-type`, { params: { page, limit, sortField, sortOrder } });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },
    createType: async (typeData) => {
        try {
            const { data } = await api.post(`/grievance-type/create`, typeData, { withCredentials: true });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },
    updateType: async (id, typeData) => {
        try {
            const { data } = await api.put(`/grievance-type/update/${id}`, typeData, { withCredentials: true });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },
    deleteType: async (id) => {
        try {
            const { data } = await api.delete(`/grievance-type/${id}`, { withCredentials: true });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    permanentDeleteType: async (id) => {
        try {
            const { data } = await api.delete(`/grievance-type/permanent/${id}`, { withCredentials: true });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    getCategoryById: async (id) => {
        try {
            const { data } = await api.get(`/grievance-category/${id}`);
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    updateCategory: async (id, categoryData) => {
        try {
            const { data } = await api.put(`/grievance-category/update/${id}`, categoryData, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    deleteCategory: async (id) => {
        try {
            const { data } = await api.delete(`/grievance-category/${id}`, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    permanentDeleteCategory: async (id) => {
        try {
            const { data } = await api.delete(`/grievance-category/permanent/${id}`, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    // grievance sub categories
    createSubCategories: async (subCategoryData) => {
        try {
            const { data } = await api.post("/grievance-sub-category/create", subCategoryData, {
                withCredentials: true
            })
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    getAllSubCategories: async (page, limit) => {
        try {
            const { data } = await api.get("/grievance-sub-category", {
                params: { page, limit }
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    getSubCategoryByCategoryId: async (categoryId, page, limit, search, { signal } = {}) => {
        try {
            const { data } = await api.get(`/grievance-sub-category/category/${categoryId}`, {
                params: { page, limit, search: search || undefined },
                signal,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    getSubCategoryById: async (id) => {
        try {
            const { data } = await api.get(`/grievance-sub-category/${id}`);
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    updateSubCategory: async (id, subCategoryData) => {
        try {
            const { data } = await api.put(`/grievance-sub-category/update/${id}`, subCategoryData, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    deleteSubCategory: async (id) => {
        try {
            const { data } = await api.delete(`/grievance-sub-category/${id}`, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    permanentDeleteSubCategory: async (id) => {
        try {
            const { data } = await api.delete(`/grievance-sub-category/permanent/${id}`, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    //departments

    getDepartments: async (page, limit, sortField, sortOrder, search, { signal, includeCustomFields = false } = {}) => {
        try {
            const { data } = await api.get(`/department`, {
                params: {
                    page,
                    limit,
                    sortField,
                    sortOrder,
                    search: search || undefined,
                    includeCustomFields: includeCustomFields ? 'true' : undefined,
                },
                withCredentials: includeCustomFields,
                signal,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    getDepartmentById: async (id) => {
        try {
            const { data } = await api.get(`/department/${id}`);
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    getMyDepartmentAssignments: async () => {
        try {
            const { data } = await api.get('/department/my-assignments', {
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    createDepartment: async (departmentData) => {
        try {
            const { data } = await api.post(`/department/create`, departmentData, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    updateDepartment: async (id, departmentData) => {
        try {
            const { data } = await api.put(`/department/update/${id}`, departmentData, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    deleteDepartment: async (id) => {
        try {
            const { data } = await api.delete(`/department/${id}`, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    permanentDeleteDepartment: async (id) => {
        try {
            const { data } = await api.delete(`/department/permanent/${id}`, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    getTableSchema: async (tableCode) => {
        try {
            const { data } = await api.get(`/table-schema/${tableCode}`, {
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    addTableColumn: async (tableCode, payload) => {
        try {
            const { data } = await api.post(`/table-schema/${tableCode}/columns`, payload, {
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    updateTableColumn: async (tableCode, columnId, payload) => {
        try {
            const { data } = await api.put(`/table-schema/${tableCode}/columns/${columnId}`, payload, {
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    deleteTableColumn: async (tableCode, columnId) => {
        try {
            const { data } = await api.delete(`/table-schema/${tableCode}/columns/${columnId}`, {
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    //ticket priorities
    getTicketPriorities: async (page, limit, search, { signal } = {}) => {
        try {
            const { data } = await api.get(`/ticket-priority`, {
                params: { page, limit, search: search || undefined },
                signal,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    getTicketPriorityById: async (id) => {
        try {
            const { data } = await api.get(`/ticket-priority/${id}`);
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    createTicketPriority: async (ticketPriorityData) => {
        try {
            const { data } = await api.post(`/ticket-priority/create`, ticketPriorityData, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    updateTicketPriority: async (id, ticketPriorityData) => {
        try {
            const { data } = await api.put(`/ticket-priority/update/${id}`, ticketPriorityData, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    deleteTicketPriority: async (id) => {
        try {
            const { data } = await api.delete(`/ticket-priority/${id}`, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    permanentDeleteTicketPriority: async (id) => {
        try {
            const { data } = await api.delete(`/ticket-priority/permanent/${id}`, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    //ticket status
    getTicketStatus: async (page, limit, search, { signal } = {}) => {
        try {
            const { data } = await api.get(`/ticket-status`, {
                params: { page, limit, search: search || undefined },
                signal,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    getTicketStatusById: async (id) => {
        try {
            const { data } = await api.get(`/ticket-status/${id}`);
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    createTicketStatus: async (ticketStatusData) => {
        try {
            const { data } = await api.post(`/ticket-status/create`, ticketStatusData, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    updateTicketStatus: async (id, ticketStatusData) => {
        try {
            const { data } = await api.put(`/ticket-status/update/${id}`, ticketStatusData, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    deleteTicketStatus: async (id) => {
        try {
            const { data } = await api.delete(`/ticket-status/${id}`, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    permanentDeleteTicketStatus: async (id) => {
        try {
            const { data } = await api.delete(`/ticket-status/permanent/${id}`, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    // employee details
    getEmployeeDetails: async (page, limit, { role_id, department_id, assignable_only, signal } = {}) => {
        try {
            const { data } = await api.get(`/employee-details`, {
                params: {
                    page,
                    limit,
                    role_id: role_id || undefined,
                    department_id: department_id || undefined,
                    assignable_only: assignable_only ? 'true' : undefined,
                },
                signal,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    getEmployeeDetailsById: async (id) => {
        try {
            const { data } = await api.get(`/employee-details/${id}`);
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    updateEmployeeDetails: async (id, employeeData) => {
        try {
            const { data } = await api.patch(`/employee-details/${id}`, employeeData, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    createEmployeeDetails: async (employeeData) => {
        try {
            const { data } = await api.post(`/employee-details`, employeeData, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },
}

export const userApi = {
    getAllUsers: async (page, limit, role, status, search, activeTab, sortField, sortOrder) => {
        try {
            const { data } = await api.get(`/user-account`, {
                params: { page, limit, role, status, search, activeTab, sortField, sortOrder }
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    getUserById: async (id) => {
        try {
            const { data } = await api.get(`/user-account/${id}`);
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    updateUserAccount: async (id, userData) => {
        try {
            const { data } = await api.put(`/user-account/update/${id}`, userData, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    createUserAccount: async (userData) => {
        try {
            const { data } = await api.post(`/user-account/register`, userData, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    loginUser: async (loginData) => {
        try {
            const { data } = await api.post(`/user-account/login`, loginData);
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    logoutUser: async () => {
        try {
            const { data } = await api.post(`/user-account/logout`, {}, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    forgotPassword: async (email) => {
        try {
            const { data } = await api.post(`/user-account/forgot-password`, { email });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    resetPassword: async (token, password) => {
        try {
            const { data } = await api.post(`/user-account/reset-password`, { token, password });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    verifyUserAccount: async () => {
        try {
            const { data } = await api.get(`/user-account/verify`, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    deleteUserAccount: async (id) => {
        try {
            const { data } = await api.delete(`/user-account/delete/${id}`, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

}

export const captchaApi = {
    generateCaptcha: async () => {
        try {
            const { data } = await api.get(`/captcha/generate`);
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    verifyCaptcha: async (code, captchaId) => {
        try {
            const { data } = await api.post(`/captcha/verify`, { code, captchaId });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    }
}

export const grievanceApi = {
    createGrievance: async (formData) => {
        try {
            const { data } = await api.post(`/grievances`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    reopenGrievance: async (id, remark) => {
        try {
            const { data } = await api.patch(`/grievances/${id}/reopen`, { remark }, {
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    getAllGrievances: async (params) => {
        try {
            const { data } = await api.get(`/grievances`, {
                params,
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    getGrievancesByRoleId: async (roleId, params) => {
        try {
            const { data } = await api.get(`/grievances/role/${roleId}`, {
                params,
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    getGrievanceById: async (id) => {
        try {
            const { data } = await api.get(`/grievances/${id}`, {
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    getGrievanceTimeline: async (id) => {
        try {
            const { data } = await api.get(`/grievances/${id}/timeline`, {
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    updateGrievance: async (id, updateData) => {
        try {
            const { data } = await api.patch(`/grievances/${id}`, updateData, {
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    deleteGrievance: async (id) => {
        try {
            const { data } = await api.delete(`/grievances/${id}`, {
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    assignGrievance: async (id, employeeIds) => {
        try {
            const { data } = await api.patch(`/grievances/${id}/assign`, { employee_ids: employeeIds }, {
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    forwardGrievance: async (id, body = {}) => {
        try {
            const { data } = await api.post(`/grievances/${id}/forward`, body, {
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },

    getGrievancesByEmployeeId: async (employeeId, params) => {
        try {
            const { data } = await api.get(`/grievances/employee/${employeeId}`, {
                params,
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },
};

export const chatApi = {
    createChat: async (chatData) => {
        try {
            const { data } = await api.post(`/chat`, chatData, { withCredentials: true });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },
    getChat: async (id) => {
        try {
            const { data } = await api.get(`/chat/${id}`, { withCredentials: true });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },
    getMessages: async (id) => {
        try {
            const { data } = await api.get(`/chat/${id}/messages`, { withCredentials: true });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },
    sendMessage: async (id, messageData) => {
        try {
            const { data } = await api.post(`/chat/${id}/messages`, messageData, { withCredentials: true });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },
    markAsRead: async (id) => {
        try {
            const { data } = await api.post(`/chat/${id}/read`, {}, { withCredentials: true });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    }
};

export const grievancePathApi = {
    createPath: async (pathData) => {
        try {
            const { data } = await api.post('/grievance-paths', pathData, { withCredentials: true });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },
    getPaths: async (page, limit, sortField, sortOrder) => {
        try {
            const { data } = await api.get('/grievance-paths', {
                params: { page, limit, sortField, sortOrder },
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },
    updatePath: async (id, pathData) => {
        try {
            const { data } = await api.put(`/grievance-paths/update/${id}`, pathData, { withCredentials: true });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },
    deletePath: async (id) => {
        try {
            const { data } = await api.delete(`/grievance-paths/${id}`, { withCredentials: true });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },
    permanentDeletePath: async (id) => {
        try {
            const { data } = await api.delete(`/grievance-paths/permanent/${id}`, { withCredentials: true });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    }
};

export const auditLogApis = {
    getAllAuditLogs: async (filters = {}, page = 1, limit = 10, sortField, sortOrder) => {
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });

            if (filters.action && filters.action !== 'All Actions') {
                queryParams.append('action', filters.action);
            }
            if (filters.entityType && filters.entityType !== 'All Entities') {
                queryParams.append('entityType', filters.entityType);
            }
            if (filters.admin && filters.admin !== 'All Admins') {
                queryParams.append('admin', filters.admin);
            }
            if (filters.dateRange && filters.dateRange !== 'All Dates') {
                queryParams.append('dateRange', filters.dateRange);
            }
            if (filters.filterDate) {
                queryParams.append('filterDate', filters.filterDate);
            }
            if (filters.startTime) {
                queryParams.append('startTime', filters.startTime);
            }
            if (filters.endTime) {
                queryParams.append('endTime', filters.endTime);
            }
            if (sortField) queryParams.append('sortField', sortField);
            if (sortOrder) queryParams.append('sortOrder', sortOrder);

            const { data } = await api.get(`/audit-logs?${queryParams.toString()}`, {
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    }
};

export const notificationApi = {
    getNotifications: async (page, limit) => {
        try {
            const { data } = await api.get(`/notifications`, {
                params: { page, limit },
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },
    markAllRead: async () => {
        try {
            const { data } = await api.patch(`/notifications/read-all`, {}, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },
    markAsRead: async (id) => {
        try {
            const { data } = await api.patch(`/notifications/${id}/read`, {}, {
                withCredentials: true
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    }
};

export const reportsApi = {
    getAdminStats: async (params = {}) => {
        try {
            const { data } = await api.get('/reports/admin', {
                params: { ...params, format: 'json' },
                withCredentials: true,
            });
            return data;
        } catch (error) {
            throw getApiError(error);
        }
    },
    downloadAdminReport: async (format, params = {}) => {
        const response = await api.get('/reports/admin', {
            params: { ...params, format },
            responseType: 'blob',
            withCredentials: true,
        });
        return response;
    },
};

export const publicGrievanceApi = {
    getCategories: async () => {
        const { data } = await api.get('/grievances/public/categories', { withCredentials: false });
        return data;
    },
    submit: async (formData) => {
        const { data } = await api.post('/grievances/public', formData, {
            withCredentials: false,
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    },
    track: async (ticketNo, mobileNumber) => {
        const { data } = await api.get('/grievances/public/track', {
            params: { ticket_no: ticketNo, mobile_number: mobileNumber },
            withCredentials: false,
        });
        return data;
    },
};