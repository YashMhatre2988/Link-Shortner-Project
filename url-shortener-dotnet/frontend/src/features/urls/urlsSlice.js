import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function readError(response) {
  try {
    const body = await response.json();
    if (body.message) return body.message;
    if (body.errors) return Object.values(body.errors).flat().join(' ');
  } catch { /* use generic message */ }
  return `Request failed (${response.status})`;
}

export const fetchUrls = createAsyncThunk('urls/fetchAll', async (_, { rejectWithValue }) => {
  const response = await fetch(`${API_BASE}/api/urls`);
  if (!response.ok) return rejectWithValue(await readError(response));
  return response.json();
});

export const createUrl = createAsyncThunk('urls/create', async (payload, { rejectWithValue }) => {
  const response = await fetch(`${API_BASE}/api/urls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) return rejectWithValue(await readError(response));
  return response.json();
});

const urlsSlice = createSlice({
  name: 'urls',
  initialState: { items: [], status: 'idle', creating: false, error: null, created: null },
  reducers: {
    clearCreated(state) { state.created = null; },
    clearError(state) { state.error = null; }
  },
  extraReducers(builder) {
    builder
      .addCase(fetchUrls.pending, state => { state.status = 'loading'; state.error = null; })
      .addCase(fetchUrls.fulfilled, (state, action) => {
        state.status = 'succeeded'; state.items = action.payload;
      })
      .addCase(fetchUrls.rejected, (state, action) => {
        state.status = 'failed'; state.error = action.payload || action.error.message;
      })
      .addCase(createUrl.pending, state => { state.creating = true; state.error = null; state.created = null; })
      .addCase(createUrl.fulfilled, (state, action) => {
        state.creating = false; state.created = action.payload;
        state.items = [action.payload, ...state.items.filter(item => item.id !== action.payload.id)].slice(0, 100);
      })
      .addCase(createUrl.rejected, (state, action) => {
        state.creating = false; state.error = action.payload || action.error.message;
      });
  }
});

export const { clearCreated, clearError } = urlsSlice.actions;
export default urlsSlice.reducer;
