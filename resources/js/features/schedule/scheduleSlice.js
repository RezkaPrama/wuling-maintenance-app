import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/axiosInstance';

// ============================================================
// THUNKS — map ke Api\MaintenanceScheduleController
// NOTE: base path diasumsikan '/v1/schedules' -- sesuaikan kalau
// nama route asli di routes/api.php berbeda.
// ============================================================

export const fetchSchedules = createAsyncThunk(
    'schedule/fetchList',
    async (params = {}, { rejectWithValue }) => {
        try {
            const { data } = await api.get('/v1/schedules', { params });
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Gagal memuat data jadwal PM.');
        }
    }
);

export const fetchScheduleFormData = createAsyncThunk(
    'schedule/fetchFormData',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get('/v1/schedules/form-data');
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Gagal memuat opsi form.');
        }
    }
);

export const fetchScheduleDetail = createAsyncThunk(
    'schedule/fetchDetail',
    async (id, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`/v1/schedules/${id}`);
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Jadwal tidak ditemukan.');
        }
    }
);

export const createSchedule = createAsyncThunk(
    'schedule/create',
    async (payload, { rejectWithValue }) => {
        try {
            const { data } = await api.post('/v1/schedules', payload);
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data || { message: 'Gagal menyimpan jadwal.' });
        }
    }
);

export const updateSchedule = createAsyncThunk(
    'schedule/update',
    async ({ id, payload }, { rejectWithValue }) => {
        try {
            const { data } = await api.put(`/v1/schedules/${id}`, payload);
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data || { message: 'Gagal memperbarui jadwal.' });
        }
    }
);

export const deleteSchedule = createAsyncThunk(
    'schedule/delete',
    async (id, { rejectWithValue }) => {
        try {
            const { data } = await api.delete(`/v1/schedules/${id}`);
            return { id, ...data };
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Gagal menghapus jadwal.');
        }
    }
);

export const recalculateScheduleStatus = createAsyncThunk(
    'schedule/recalculate',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.post('/v1/schedules/recalculate-status');
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Gagal sync status jadwal.');
        }
    }
);

const initialState = {
    list: {
        items: [],
        pagination: null,
        calendar: { year: null, month: null, events: [] },
        stats: { total: 0, pending: 0, due: 0, overdue: 0, completed: 0 },
        scheduleThisMonth: 0,
        etmGroups: [],
        filters: {
            filter_status: '',
            filter_cycle: '',
            filter_group: '',
            filter_month: new Date().toISOString().slice(0, 7), // 'YYYY-MM'
        },
        status: 'idle',
        error: null,
    },
    formOptions: {
        equipment_list: [],
        existing_schedules: [],
        status: 'idle',
    },
    detail: {
        data: null,
        status: 'idle',
        error: null,
    },
    mutation: {
        status: 'idle',
        error: null,
        fieldErrors: null,
    },
    recalculate: {
        status: 'idle',
    },
};

const scheduleSlice = createSlice({
    name: 'schedule',
    initialState,
    reducers: {
        setListFilters(state, action) {
            state.list.filters = { ...state.list.filters, ...action.payload };
        },
        clearMutationState(state) {
            state.mutation = { status: 'idle', error: null, fieldErrors: null };
        },
        clearDetail(state) {
            state.detail = { data: null, status: 'idle', error: null };
        },
    },
    extraReducers: (builder) => {
        builder
            // ── LIST ──
            .addCase(fetchSchedules.pending, (state) => { state.list.status = 'loading'; })
            .addCase(fetchSchedules.fulfilled, (state, action) => {
                // Defensive: kalau shape response API beda dari yang diharapkan
                // (misal endpoint salah / controller berubah), jangan crash --
                // tandai gagal supaya UI nampilin pesan error yang jelas.
                if (!action.payload?.schedules) {
                    state.list.status = 'failed';
                    state.list.error = 'Format respons API tidak sesuai yang diharapkan (field "schedules" tidak ada). Cek endpoint /v1/schedules.';
                    return;
                }
                state.list.status = 'succeeded';
                state.list.items = action.payload.schedules.data || [];
                state.list.pagination = {
                    current_page: action.payload.schedules.current_page,
                    last_page: action.payload.schedules.last_page,
                    total: action.payload.schedules.total,
                    from: action.payload.schedules.from,
                    to: action.payload.schedules.to,
                };
                state.list.calendar = action.payload.calendar || { year: null, month: null, events: [] };
                state.list.stats = action.payload.stats || {};
                state.list.scheduleThisMonth = action.payload.schedule_this_month || 0;
                state.list.etmGroups = action.payload.etm_groups || [];
            })
            .addCase(fetchSchedules.rejected, (state, action) => {
                state.list.status = 'failed';
                state.list.error = action.payload;
            })

            // ── FORM OPTIONS ──
            .addCase(fetchScheduleFormData.pending, (state) => { state.formOptions.status = 'loading'; })
            .addCase(fetchScheduleFormData.fulfilled, (state, action) => {
                state.formOptions.status = 'succeeded';
                state.formOptions.equipment_list = action.payload.equipment_list;
                state.formOptions.existing_schedules = action.payload.existing_schedules;
            })

            // ── DETAIL ──
            .addCase(fetchScheduleDetail.pending, (state) => { state.detail.status = 'loading'; })
            .addCase(fetchScheduleDetail.fulfilled, (state, action) => {
                state.detail.status = 'succeeded';
                state.detail.data = action.payload;
            })
            .addCase(fetchScheduleDetail.rejected, (state, action) => {
                state.detail.status = 'failed';
                state.detail.error = action.payload;
            })

            // ── CREATE ──
            .addCase(createSchedule.pending, (state) => {
                state.mutation.status = 'loading'; state.mutation.error = null; state.mutation.fieldErrors = null;
            })
            .addCase(createSchedule.fulfilled, (state) => { state.mutation.status = 'succeeded'; })
            .addCase(createSchedule.rejected, (state, action) => {
                state.mutation.status = 'failed';
                state.mutation.error = action.payload?.message;
                state.mutation.fieldErrors = action.payload?.errors || null;
            })

            // ── UPDATE ──
            .addCase(updateSchedule.pending, (state) => {
                state.mutation.status = 'loading'; state.mutation.error = null; state.mutation.fieldErrors = null;
            })
            .addCase(updateSchedule.fulfilled, (state) => { state.mutation.status = 'succeeded'; })
            .addCase(updateSchedule.rejected, (state, action) => {
                state.mutation.status = 'failed';
                state.mutation.error = action.payload?.message;
                state.mutation.fieldErrors = action.payload?.errors || null;
            })

            // ── DELETE ──
            .addCase(deleteSchedule.fulfilled, (state, action) => {
                state.list.items = state.list.items.filter((s) => s.id !== action.payload.id);
            })
            .addCase(deleteSchedule.rejected, (state, action) => {
                state.list.error = action.payload;
            })

            // ── RECALCULATE ──
            .addCase(recalculateScheduleStatus.pending, (state) => { state.recalculate.status = 'loading'; })
            .addCase(recalculateScheduleStatus.fulfilled, (state) => { state.recalculate.status = 'succeeded'; })
            .addCase(recalculateScheduleStatus.rejected, (state) => { state.recalculate.status = 'failed'; });
    },
});

export const { setListFilters, clearMutationState, clearDetail } = scheduleSlice.actions;
export default scheduleSlice.reducer;