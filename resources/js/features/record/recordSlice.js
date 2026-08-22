import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/axiosInstance';

// ============================================================
// THUNKS — map ke Api\MaintenanceRecordController
// Base path: /v1/records
// ============================================================

export const fetchRecords = createAsyncThunk(
    'record/fetchList',
    async (params = {}, { rejectWithValue }) => {
        try {
            const { data } = await api.get('/v1/records', { params });
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Gagal memuat data maintenance record.');
        }
    }
);

// ── Thunk-thunk berikut disiapkan untuk tahap Create & Work selanjutnya ──

export const fetchRecordCreateData = createAsyncThunk(
    'record/fetchCreateData',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get('/v1/records/create-data');
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Gagal memuat data form.');
        }
    }
);

export const fetchTemplatesForSchedule = createAsyncThunk(
    'record/fetchTemplatesForSchedule',
    async (scheduleId, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`/v1/records/schedule/${scheduleId}/templates`);
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Gagal memuat template check sheet.');
        }
    }
);

export const createRecord = createAsyncThunk(
    'record/create',
    async (payload, { rejectWithValue }) => {
        try {
            const { data } = await api.post('/v1/records', payload);
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data || { message: 'Gagal membuat record.' });
        }
    }
);

export const fetchRecordDetail = createAsyncThunk(
    'record/fetchDetail',
    async (id, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`/v1/records/${id}`);
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Record tidak ditemukan.');
        }
    }
);

export const fetchRecordWork = createAsyncThunk(
    'record/fetchWork',
    async (id, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`/v1/records/${id}/work`);
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Gagal memuat data pengerjaan.');
        }
    }
);

export const updateRecordItem = createAsyncThunk(
    'record/updateItem',
    async ({ recordId, itemId, payload }, { rejectWithValue }) => {
        try {
            const { data } = await api.put(`/v1/records/${recordId}/items/${itemId}`, payload);
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Gagal menyimpan item.');
        }
    }
);

export const uploadItemPhoto = createAsyncThunk(
    'record/uploadItemPhoto',
    async ({ recordId, itemId, file }, { rejectWithValue }) => {
        try {
            const formData = new FormData();
            formData.append('photo', file);
            const { data } = await api.post(`/v1/records/${recordId}/items/${itemId}/photo`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Gagal upload foto.');
        }
    }
);

export const completeRecord = createAsyncThunk(
    'record/complete',
    async (id, { rejectWithValue }) => {
        try {
            const { data } = await api.post(`/v1/records/${id}/complete`);
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Gagal menyelesaikan record.');
        }
    }
);

export const validateRecord = createAsyncThunk(
    'record/validate',
    async ({ id, action, notes }, { rejectWithValue }) => {
        try {
            const { data } = await api.post(`/v1/records/${id}/validate`, { action, notes });
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Gagal memproses validasi.');
        }
    }
);

const initialState = {
    list: {
        items: [],
        pagination: null,
        stats: { total: 0, in_progress: 0, completed: 0, validated: 0, rejected: 0 },
        filters: {
            search: '',
            filter_status: '',
            filter_cycle: '',
            filter_month: '',
        },
        status: 'idle',
        error: null,
    },
    createData: {
        equipment_list: [],
        due_schedules: [],
        status: 'idle',
    },
    scheduleTemplates: {
        schedule: null,
        templates: [],
        status: 'idle',
    },
    mutation: {
        status: 'idle',
        error: null,
        fieldErrors: null,
    },
    detail: {
        data: null,
        status: 'idle',
        error: null,
    },
    work: {
        data: null,
        status: 'idle',
        error: null,
    },
};

const recordSlice = createSlice({
    name: 'record',
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
        clearWork(state) {
            state.work = { data: null, status: 'idle', error: null };
        },
        clearScheduleTemplates(state) {
            state.scheduleTemplates = { schedule: null, templates: [], status: 'idle' };
        },
    },
    extraReducers: (builder) => {
        builder
            // ── LIST ──
            .addCase(fetchRecords.pending, (state) => { state.list.status = 'loading'; })
            .addCase(fetchRecords.fulfilled, (state, action) => {
                state.list.status = 'succeeded';
                state.list.items = action.payload.records?.data || [];
                state.list.pagination = {
                    current_page: action.payload.records?.current_page,
                    last_page: action.payload.records?.last_page,
                    total: action.payload.records?.total,
                    from: action.payload.records?.from,
                    to: action.payload.records?.to,
                };
                state.list.stats = action.payload.stats || {};
            })
            .addCase(fetchRecords.rejected, (state, action) => {
                state.list.status = 'failed';
                state.list.error = action.payload;
            })

            // ── CREATE DATA ──
            .addCase(fetchRecordCreateData.pending, (state) => { state.createData.status = 'loading'; })
            .addCase(fetchRecordCreateData.fulfilled, (state, action) => {
                state.createData.status = 'succeeded';
                state.createData.equipment_list = action.payload.equipment_list || [];
                state.createData.due_schedules = action.payload.due_schedules || [];
            })
            .addCase(fetchRecordCreateData.rejected, (state) => { state.createData.status = 'failed'; })

            // ── TEMPLATES FOR SCHEDULE ──
            .addCase(fetchTemplatesForSchedule.pending, (state) => { state.scheduleTemplates.status = 'loading'; })
            .addCase(fetchTemplatesForSchedule.fulfilled, (state, action) => {
                state.scheduleTemplates.status = 'succeeded';
                state.scheduleTemplates.schedule = action.payload.schedule;
                state.scheduleTemplates.templates = action.payload.templates || [];
            })
            .addCase(fetchTemplatesForSchedule.rejected, (state) => { state.scheduleTemplates.status = 'failed'; })

            // ── CREATE ──
            .addCase(createRecord.pending, (state) => {
                state.mutation.status = 'loading'; state.mutation.error = null; state.mutation.fieldErrors = null;
            })
            .addCase(createRecord.fulfilled, (state) => { state.mutation.status = 'succeeded'; })
            .addCase(createRecord.rejected, (state, action) => {
                state.mutation.status = 'failed';
                state.mutation.error = action.payload?.message;
                state.mutation.fieldErrors = action.payload?.errors || null;
            })

            // ── DETAIL ──
            .addCase(fetchRecordDetail.pending, (state) => { state.detail.status = 'loading'; })
            .addCase(fetchRecordDetail.fulfilled, (state, action) => {
                state.detail.status = 'succeeded';
                state.detail.data = action.payload;
            })
            .addCase(fetchRecordDetail.rejected, (state, action) => {
                state.detail.status = 'failed';
                state.detail.error = action.payload;
            })

            // ── WORK ──
            .addCase(fetchRecordWork.pending, (state) => { state.work.status = 'loading'; })
            .addCase(fetchRecordWork.fulfilled, (state, action) => {
                state.work.status = 'succeeded';
                state.work.data = action.payload;
            })
            .addCase(fetchRecordWork.rejected, (state, action) => {
                state.work.status = 'failed';
                state.work.error = action.payload;
            });
    },
});

export const { setListFilters, clearMutationState, clearDetail, clearWork, clearScheduleTemplates } = recordSlice.actions;
export default recordSlice.reducer;