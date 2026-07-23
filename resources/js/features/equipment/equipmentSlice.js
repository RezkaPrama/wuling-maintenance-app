import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/axiosInstance';

// ============================================================
// THUNKS — masing-masing map 1:1 ke endpoint Api\EquipmentController
// ============================================================

// GET /equipment?search=&filter_status=&filter_group=&filter_location=&per_page=&page=
export const fetchEquipments = createAsyncThunk(
    'equipment/fetchList',
    async (params = {}, { rejectWithValue }) => {
        try {
            const { data } = await api.get('/v1/equipment', { params });
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Gagal memuat data equipment.');
        }
    }
);

// GET /equipment/form-data — dropdown etm_group & location (dipakai form create & edit)
export const fetchFormData = createAsyncThunk(
    'equipment/fetchFormData',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get('/v1/equipment/form-data');
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Gagal memuat opsi form.');
        }
    }
);

// GET /equipment/{id}
// GET /equipment/{id}?filter_year=&filter_status=&per_page=&page=
export const fetchEquipmentDetail = createAsyncThunk(
    'equipment/fetchDetail',
    async ({ id, params = {} }, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`/v1/equipment/${id}`, { params });
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Equipment tidak ditemukan.');
        }
    }
);

// GET /equipment/{id} tapi HANYA update bagian history-nya (dipakai saat
// user ganti filter tahun/status di tab Riwayat, supaya nggak perlu
// refetch equipment/schedules/qr_code yang tidak berubah).
export const fetchEquipmentHistory = createAsyncThunk(
    'equipment/fetchHistory',
    async ({ id, params = {} }, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`/v1/equipment/${id}`, { params });
            return data.history;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Gagal memuat riwayat.');
        }
    }
);

// POST /equipment
export const createEquipment = createAsyncThunk(
    'equipment/create',
    async (payload, { rejectWithValue }) => {
        try {
            const { data } = await api.post('/v1/equipment', payload);
            return data;
        } catch (err) {
            // 422 -> validation errors per-field, dilempar apa adanya ke komponen
            return rejectWithValue(err.response?.data || { message: 'Gagal menyimpan equipment.' });
        }
    }
);

// PUT /equipment/{id}
export const updateEquipment = createAsyncThunk(
    'equipment/update',
    async ({ id, payload }, { rejectWithValue }) => {
        try {
            const { data } = await api.put(`/v1/equipment/${id}`, payload);
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data || { message: 'Gagal memperbarui equipment.' });
        }
    }
);

// DELETE /equipment/{id}
export const deleteEquipment = createAsyncThunk(
    'equipment/delete',
    async (id, { rejectWithValue }) => {
        try {
            const { data } = await api.delete(`/v1/equipment/${id}`);
            return { id, ...data };
        } catch (err) {
            // 409 -> masih ada maintenance record, tampilkan message dari backend
            return rejectWithValue(err.response?.data?.message || 'Gagal menghapus equipment.');
        }
    }
);

const initialState = {
    list: {
        items: [],
        pagination: null, // { current_page, last_page, total, ... } dari Laravel paginate()
        stats: { total_active: 0, total_maintenance: 0, total_inactive: 0, total_overdue: 0 },
        filters: { search: '', filter_status: '', filter_group: '', filter_location: '' },
        status: 'idle', // idle | loading | succeeded | failed
        error: null,
    },
    formOptions: {
        etm_groups: [],
        locations: [],
        status: 'idle',
    },
    detail: {
        data: null,
        status: 'idle',
        error: null,
    },
    mutation: {
        status: 'idle', // dipakai bareng utk create/update/delete supaya tombol submit bisa disable
        error: null,
        fieldErrors: null, // dari Laravel 422 -> { equipment_code: [...], ... }
    },
};

const equipmentSlice = createSlice({
    name: 'equipment',
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
            .addCase(fetchEquipments.pending, (state) => {
                state.list.status = 'loading';
            })
            .addCase(fetchEquipments.fulfilled, (state, action) => {
                state.list.status = 'succeeded';
                state.list.items = action.payload.equipments.data;
                state.list.pagination = {
                    current_page: action.payload.equipments.current_page,
                    last_page: action.payload.equipments.last_page,
                    total: action.payload.equipments.total,
                    per_page: action.payload.equipments.per_page,
                };
                state.list.stats = action.payload.stats;
            })
            .addCase(fetchEquipments.rejected, (state, action) => {
                state.list.status = 'failed';
                state.list.error = action.payload;
            })

            // ── FORM OPTIONS ──────────────────────────────────────────
            .addCase(fetchFormData.pending, (state) => {
                state.formOptions.status = 'loading';
            })
            .addCase(fetchFormData.fulfilled, (state, action) => {
                state.formOptions.status = 'succeeded';
                state.formOptions.etm_groups = action.payload.etm_groups;
                state.formOptions.locations = action.payload.locations;
            })

            // ── DETAIL ────────────────────────────────────────────────
            .addCase(fetchEquipmentDetail.pending, (state) => {
                state.detail.status = 'loading';
            })
            .addCase(fetchEquipmentDetail.fulfilled, (state, action) => {
                state.detail.status = 'succeeded';
                state.detail.data = action.payload;
            })
            .addCase(fetchEquipmentDetail.rejected, (state, action) => {
                state.detail.status = 'failed';
                state.detail.error = action.payload;
            })

            // ── CREATE ────────────────────────────────────────────────
            .addCase(createEquipment.pending, (state) => {
                state.mutation.status = 'loading';
                state.mutation.error = null;
                state.mutation.fieldErrors = null;
            })
            .addCase(createEquipment.fulfilled, (state) => {
                state.mutation.status = 'succeeded';
            })
            .addCase(createEquipment.rejected, (state, action) => {
                state.mutation.status = 'failed';
                state.mutation.error = action.payload?.message;
                state.mutation.fieldErrors = action.payload?.errors || null;
            })

            // ── UPDATE ────────────────────────────────────────────────
            .addCase(updateEquipment.pending, (state) => {
                state.mutation.status = 'loading';
                state.mutation.error = null;
                state.mutation.fieldErrors = null;
            })
            .addCase(updateEquipment.fulfilled, (state, action) => {
                state.mutation.status = 'succeeded';
                if (state.detail.data) {
                    state.detail.data.equipment = action.payload.equipment;
                }
            })
            .addCase(updateEquipment.rejected, (state, action) => {
                state.mutation.status = 'failed';
                state.mutation.error = action.payload?.message;
                state.mutation.fieldErrors = action.payload?.errors || null;
            })

            // ── DELETE ────────────────────────────────────────────────
            .addCase(deleteEquipment.fulfilled, (state, action) => {
                state.list.items = state.list.items.filter((e) => e.id !== action.payload.id);
            })
            .addCase(deleteEquipment.rejected, (state, action) => {
                state.list.error = action.payload;
            });
    },
});

export const { setListFilters, clearMutationState, clearDetail } = equipmentSlice.actions;
export default equipmentSlice.reducer;