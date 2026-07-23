import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/axiosInstance';

export const login = createAsyncThunk('auth/login', async ({ login, password }, { rejectWithValue }) => {
    try {
        // NOTE: endpoint TANPA prefix /v1, sesuai routes/api.php:
        // Route::post('/login', ...) didaftarkan di luar grup middleware auth:sanctum.
        const { data } = await api.post('/login', { login, password });
        // Response envelope dari Api\AuthController: { success, message, data: { user, token } }
        localStorage.setItem('sanctum_token', data.data.token);
        return data.data; // { user, token }
    } catch (err) {
        // Laravel ValidationException -> error.response.data.errors.login[0]
        const message = err.response?.data?.errors?.login?.[0] || err.response?.data?.message || 'Login gagal.';
        return rejectWithValue(message);
    }
});

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        token: localStorage.getItem('sanctum_token') || null,
        status: 'idle', // idle | loading | failed
        error: null,
    },
    reducers: {
        logout(state) {
            localStorage.removeItem('sanctum_token');
            state.user = null;
            state.token = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(login.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.status = 'idle';
                state.token = action.payload.token;
                state.user = action.payload.user;
            })
            .addCase(login.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            });
    },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;