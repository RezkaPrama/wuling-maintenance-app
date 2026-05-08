import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchDashboardSummary = createAsyncThunk(
    'dashboard/fetchSummary',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axios.get('/api/maintenance-schedule/dashboard/summary');
            return response.data.data;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || 'Gagal mengambil data dashboard.'
            );
        }
    }
);

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState: {
        summary: {
            overdue: 0,
            due_today: 0,
            due_this_week: 0,
            in_progress: 0,
            completed_today: 0,
        },
        loading: false,
        error: null,
        lastFetched: null,
    },
    reducers: {
        clearDashboardError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchDashboardSummary.pending, (state) => {
                state.loading = true;
                state.error   = null;
            })
            .addCase(fetchDashboardSummary.fulfilled, (state, action) => {
                state.loading     = false;
                state.summary     = action.payload;
                state.lastFetched = new Date().toISOString();
            })
            .addCase(fetchDashboardSummary.rejected, (state, action) => {
                state.loading = false;
                state.error   = action.payload;
            });
    },
});

export const { clearDashboardError } = dashboardSlice.actions;
export default dashboardSlice.reducer;

// Selectors
export const selectDashboardSummary     = (state) => state.dashboard.summary;
export const selectDashboardLoading     = (state) => state.dashboard.loading;
export const selectDashboardError       = (state) => state.dashboard.error;
export const selectDashboardLastFetched = (state) => state.dashboard.lastFetched;