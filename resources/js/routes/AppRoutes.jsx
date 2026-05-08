import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from '../components/ProtectedRoute';

// Placeholder pages - ganti dengan halaman asli nanti
const DashboardPage = () => (
    <div className="d-flex flex-column flex-root">
        <div className="p-10">
            <h1>Dashboard</h1>
            <p>Selamat datang! Anda berhasil login.</p>
        </div>
    </div>
);

const AppRoutes = () => {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes - membutuhkan autentikasi */}
            <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                {/* Tambahkan route lain di sini:
                <Route path="/equipment" element={<EquipmentPage />} />
                <Route path="/maintenance" element={<MaintenancePage />} />
                */}
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
};

export default AppRoutes;