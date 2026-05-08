import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const loginUser = createAsyncThunk(
    'auth/login',
    async ({ employee_id, password }, { rejectWithValue }) => {
        try {
            const response = await axios.post('/api/login', { employee_id, password });

            const { token, user } = response.data.data;

            localStorage.setItem('sanctum_token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            return { token, user };
        } catch (error) {
            // ValidationException Laravel → 422
            if (error.response?.status === 422) {
                const errors = error.response.data?.errors;
                const firstError = errors
                    ? Object.values(errors).flat()[0]
                    : 'Kredensial tidak valid.';
                return rejectWithValue(firstError);
            }
            return rejectWithValue(
                error.response?.data?.message || 'Login gagal. Coba lagi.'
            );
        }
    }
);

export const logoutUser = createAsyncThunk(
    'auth/logout',
    async (_, { rejectWithValue }) => {
        try {
            await axios.post('/api/logout');
        } catch (_) {
            // tetap lanjut logout meski API error
        } finally {
            localStorage.removeItem('sanctum_token');
            delete axios.defaults.headers.common['Authorization'];
        }
    }
);

export const fetchCurrentUser = createAsyncThunk(
    'auth/me',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axios.get('/api/me');
            return response.data.data;
        } catch {
            return rejectWithValue('Sesi tidak valid.');
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        token: localStorage.getItem('sanctum_token') || null,
        loading: false,
        error: null,
    },
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        setCredentials: (state, action) => {
            state.user  = action.payload.user;
            state.token = action.payload.token;
        },
        clearAuth: (state) => {
            state.user  = null;
            state.token = null;
            state.error = null;
            localStorage.removeItem('sanctum_token');
            delete axios.defaults.headers.common['Authorization'];
        },
    },
    extraReducers: (builder) => {
        builder
            // Login
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error   = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user    = action.payload.user;
                state.token   = action.payload.token;
                state.error   = null;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error   = action.payload;
            })

            // Logout
            .addCase(logoutUser.fulfilled, (state) => {
                state.user    = null;
                state.token   = null;
                state.loading = false;
                state.error   = null;
            })

            // /me — restore session
            .addCase(fetchCurrentUser.fulfilled, (state, action) => {
                state.user = action.payload;
            })
            .addCase(fetchCurrentUser.rejected, (state) => {
                // Token expired/invalid → bersihkan
                state.user  = null;
                state.token = null;
                localStorage.removeItem('sanctum_token');
                delete axios.defaults.headers.common['Authorization'];
            });
    },
});

export const { clearError, setCredentials, clearAuth } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectCurrentUser     = (state) => state.auth.user;
export const selectCurrentToken    = (state) => state.auth.token;
export const selectAuthLoading     = (state) => state.auth.loading;
export const selectAuthError       = (state) => state.auth.error;
export const selectIsAuthenticated = (state) => !!state.auth.token;