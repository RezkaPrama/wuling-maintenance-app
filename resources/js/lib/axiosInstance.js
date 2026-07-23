import axios from 'axios';

// ── Instance khusus untuk panggil API Laravel (Sanctum token) ────────────
// Base URL /api saja (BUKAN /api/v1), karena route auth (/login) tidak
// pakai prefix v1, sedangkan modul lain (equipment, dst) pakai prefix v1.
// Jadi tiap pemanggilan modul harus tulis path lengkap: api.get('/v1/equipment').
const api = axios.create({
    baseURL: '/api',
    headers: {
        Accept: 'application/json',
    },
});

// ── Request interceptor: selipkan Bearer token di setiap request ────────
// Sanctum token dipakai sama persis seperti JWT — cukup header Bearer,
// tidak perlu perubahan lain di sini walau Laravel-nya ganti guard.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('sanctum_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ── Response interceptor: kalau token expired/invalid (401) ──────────────
// PENTING: file ini SENGAJA tidak import `store` atau `authSlice` langsung,
// supaya tidak circular import (store -> authSlice -> axiosInstance -> store).
// Sebagai gantinya, broadcast custom event yang didengarkan di app.jsx,
// baru dari situ dispatch logout ke Redux.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
        return Promise.reject(error);
    }
);

export default api;