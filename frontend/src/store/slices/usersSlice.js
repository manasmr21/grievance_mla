import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { masterApis, userApi } from '../../services/api/api';

export const fetchRolesThunk = createAsyncThunk(
  'users/fetchRoles',
  async (_, { rejectWithValue }) => {
    try {
      const response = await masterApis.getRoles();
      return response.data || response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch roles');
    }
  }
);

export const fetchDepartmentsThunk = createAsyncThunk(
  'users/fetchDepartments',
  async (_, { rejectWithValue }) => {
    try {
      const response = await masterApis.getDepartments();
      return response.data || response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch departments');
    }
  }
);

export const fetchTicketStatusesThunk = createAsyncThunk(
  'users/fetchTicketStatuses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await masterApis.getTicketStatus();
      return response.data || response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch ticket statuses');
    }
  }
);

export const fetchAllUsersForKPIsThunk = createAsyncThunk(
  'users/fetchAllUsersForKPIs',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userApi.getAllUsers();
      return response.data || response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch all users');
    }
  }
);

export const fetchPaginatedUsersThunk = createAsyncThunk(
  'users/fetchPaginatedUsers',
  async ({ page, limit, role, status, search, activeTab, sortField, sortOrder }, { rejectWithValue }) => {
    try {
      const response = await userApi.getAllUsers(page, limit, role, status, search, activeTab, sortField, sortOrder);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch paginated users');
    }
  }
);

const initialState = {
  usersArray: [],
  allUsersArray: [],
  totalUsers: 0,
  totalPages: 1,
  roleArray: [],
  departmentArray: [],
  statusArray: [],
  loading: false,
  error: null
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    updateUserStatusLocally: (state, action) => {
      const { id, status } = action.payload;
      state.usersArray = state.usersArray.map(u => 
        u.id === id ? { ...u, account_status: status } : u
      );
      state.allUsersArray = state.allUsersArray.map(u => 
        u.id === id ? { ...u, account_status: status } : u
      );
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRolesThunk.fulfilled, (state, action) => {
        state.roleArray = action.payload;
      })
      .addCase(fetchDepartmentsThunk.fulfilled, (state, action) => {
        state.departmentArray = action.payload;
      })
      .addCase(fetchTicketStatusesThunk.fulfilled, (state, action) => {
        state.statusArray = action.payload;
      })
      .addCase(fetchAllUsersForKPIsThunk.fulfilled, (state, action) => {
        state.allUsersArray = action.payload;
      })
      .addCase(fetchPaginatedUsersThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPaginatedUsersThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.usersArray = action.payload.data || [];
        state.totalUsers = action.payload.total || 0;
        state.totalPages = action.payload.totalPages || 1;
      })
      .addCase(fetchPaginatedUsersThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { updateUserStatusLocally } = usersSlice.actions;
export default usersSlice.reducer;
