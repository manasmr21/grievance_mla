// src/store/slices/typesSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { masterApis } from '../../services/api/api';

// Thunk to fetch grievance types with optional pagination
export const fetchTypesThunk = createAsyncThunk(
  'types/fetchAll',
  async ({ page = 1, limit = 10 } = {}, { rejectWithValue }) => {
    try {
      const response = await masterApis.getTypes(page, limit);
      // API returns { data, total, page, limit, totalPages }
      return response;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch types');
    }
  }
);

export const addTypeThunk = createAsyncThunk(
  'types/add',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await masterApis.createType(payload);
      return response;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to add type');
    }
  }
);

export const updateTypeThunk = createAsyncThunk(
  'types/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await masterApis.updateType(id, data);
      return { id, data: response };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update type');
    }
  }
);

export const deleteTypeThunk = createAsyncThunk(
  'types/delete',
  async (id, { rejectWithValue }) => {
    try {
      const response = await masterApis.deleteType(id);
      return { id, response };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to delete type');
    }
  }
);

const initialState = {
  typesArray: [],
  totalTypes: 0,
  totalPages: 1,
  loading: false,
  error: null,
};

const typesSlice = createSlice({
  name: 'types',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTypesThunk.pending, state => {
        state.loading = true;
      })
      .addCase(fetchTypesThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.typesArray = action.payload.data || [];
        state.totalTypes = action.payload.total || 0;
        state.totalPages = action.payload.totalPages || 1;
      })
      .addCase(fetchTypesThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addTypeThunk.fulfilled, (state, action) => {
        state.typesArray.unshift(action.payload.data || action.payload);
        state.totalTypes += 1;
      })
      .addCase(updateTypeThunk.fulfilled, (state, action) => {
        const idx = state.typesArray.findIndex(t => t.id === action.payload.id);
        if (idx >= 0) {
          state.typesArray[idx] = { ...state.typesArray[idx], ...action.payload.data };
        }
      })
      .addCase(deleteTypeThunk.fulfilled, (state, action) => {
        state.typesArray = state.typesArray.filter(t => t.id !== action.payload.id);
        state.totalTypes -= 1;
      });
  },
});

export default typesSlice.reducer;
