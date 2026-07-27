import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/axiosInstance';

// ============================================================
// THUNKS
// ============================================================

export const fetchTemplates = createAsyncThunk(
    'checksheet/fetchList',
    async (params = {}, { rejectWithValue }) => {
        try {
            const { data } = await api.get('/v1/check-sheet/templates', { params });
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Gagal memuat data template.');
        }
    }
);

// Dropdown equipment aktif, master pm_types, daftar etm_group + info default saat ini
export const fetchTemplateFormData = createAsyncThunk(
    'checksheet/fetchFormData',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get('/v1/check-sheet/templates/form-data');
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Gagal memuat opsi form.');
        }
    }
);

export const fetchTemplateDetail = createAsyncThunk(
    'checksheet/fetchDetail',
    async (id, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`/v1/check-sheet/templates/${id}`);
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Template tidak ditemukan.');
        }
    }
);

export const createTemplate = createAsyncThunk(
    'checksheet/create',
    async (payload, { rejectWithValue }) => {
        try {
            const { data } = await api.post('/v1/check-sheet/templates', payload);
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data || { message: 'Gagal menyimpan template.' });
        }
    }
);

export const updateTemplate = createAsyncThunk(
    'checksheet/update',
    async ({ id, payload }, { rejectWithValue }) => {
        try {
            const { data } = await api.put(`/v1/check-sheet/templates/${id}`, payload);
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data || { message: 'Gagal memperbarui template.' });
        }
    }
);

export const toggleTemplateActive = createAsyncThunk(
    'checksheet/toggleActive',
    async (id, { rejectWithValue }) => {
        try {
            const { data } = await api.patch(`/v1/check-sheet/templates/${id}/toggle`);
            return { id, ...data };
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Gagal mengubah status template.');
        }
    }
);

export const deleteTemplate = createAsyncThunk(
    'checksheet/delete',
    async (id, { rejectWithValue }) => {
        try {
            const { data } = await api.delete(`/v1/check-sheet/templates/${id}`);
            return { id, ...data };
        } catch (err) {
            // 409 -> sudah dipakai maintenance record, tampilkan message dari backend
            return rejectWithValue(err.response?.data?.message || 'Gagal menghapus template.');
        }
    }
);

const initialState = {
    list: {
        items: [],
        pagination: null,
        stats: null,
        filters: { search: '', filter_cycle: 'all', filter_equipment: '' },
        equipmentListForFilter: [],
        status: 'idle',
        error: null,
    },
    formOptions: {
        equipment_list: [],
        pm_types: [],
        machine_categories: [],
        current_defaults: [], // [{ id, template_name, default_for_etm_group }]
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
};

const checkSheetSlice = createSlice({
    name: 'checksheet',
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
            // ── LIST ──────────────────────────────────────────────────
            .addCase(fetchTemplates.pending, (state) => {
                state.list.status = 'loading';
            })
            .addCase(fetchTemplates.fulfilled, (state, action) => {
                state.list.status = 'succeeded';
                state.list.items = action.payload.templates.data;
                state.list.pagination = {
                    current_page: action.payload.templates.current_page,
                    last_page: action.payload.templates.last_page,
                    total: action.payload.templates.total,
                };
                state.list.stats = action.payload.stats;
                state.list.equipmentListForFilter = action.payload.equipment_list;
            })
            .addCase(fetchTemplates.rejected, (state, action) => {
                state.list.status = 'failed';
                state.list.error = action.payload;
            })

            // ── FORM OPTIONS ──────────────────────────────────────────
            .addCase(fetchTemplateFormData.pending, (state) => {
                state.formOptions.status = 'loading';
            })
            .addCase(fetchTemplateFormData.fulfilled, (state, action) => {
                state.formOptions.status = 'succeeded';
                state.formOptions.equipment_list = action.payload.equipment_list;
                state.formOptions.pm_types = action.payload.pm_types;
                state.formOptions.machine_categories = action.payload.machine_categories;
                state.formOptions.current_defaults = action.payload.current_defaults;
            })

            // ── DETAIL ────────────────────────────────────────────────
            .addCase(fetchTemplateDetail.pending, (state) => {
                state.detail.status = 'loading';
            })
            .addCase(fetchTemplateDetail.fulfilled, (state, action) => {
                state.detail.status = 'succeeded';
                state.detail.data = action.payload;
            })
            .addCase(fetchTemplateDetail.rejected, (state, action) => {
                state.detail.status = 'failed';
                state.detail.error = action.payload;
            })

            // ── CREATE ────────────────────────────────────────────────
            .addCase(createTemplate.pending, (state) => {
                state.mutation.status = 'loading';
                state.mutation.error = null;
                state.mutation.fieldErrors = null;
            })
            .addCase(createTemplate.fulfilled, (state) => {
                state.mutation.status = 'succeeded';
            })
            .addCase(createTemplate.rejected, (state, action) => {
                state.mutation.status = 'failed';
                state.mutation.error = action.payload?.message;
                state.mutation.fieldErrors = action.payload?.errors || null;
            })

            // ── UPDATE ────────────────────────────────────────────────
            .addCase(updateTemplate.pending, (state) => {
                state.mutation.status = 'loading';
                state.mutation.error = null;
                state.mutation.fieldErrors = null;
            })
            .addCase(updateTemplate.fulfilled, (state) => {
                state.mutation.status = 'succeeded';
            })
            .addCase(updateTemplate.rejected, (state, action) => {
                state.mutation.status = 'failed';
                state.mutation.error = action.payload?.message;
                state.mutation.fieldErrors = action.payload?.errors || null;
            })

            // ── TOGGLE ACTIVE ─────────────────────────────────────────
            .addCase(toggleTemplateActive.fulfilled, (state, action) => {
                const item = state.list.items.find((t) => t.id === action.payload.id);
                if (item) item.is_active = action.payload.is_active;
                if (state.detail.data?.template?.id === action.payload.id) {
                    state.detail.data.template.is_active = action.payload.is_active;
                }
            })

            // ── DELETE ────────────────────────────────────────────────
            .addCase(deleteTemplate.fulfilled, (state, action) => {
                state.list.items = state.list.items.filter((t) => t.id !== action.payload.id);
            });
    },
});

export const { setListFilters, clearMutationState, clearDetail } = checkSheetSlice.actions;
export default checkSheetSlice.reducer;