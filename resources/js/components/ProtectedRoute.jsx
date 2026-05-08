import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '../store/slices/authSlice';

/**
 * ProtectedRoute - Redirect ke /login jika belum autentikasi
 * Gunakan sebagai wrapper untuk route yang membutuhkan login
 *
 * Contoh penggunaan di AppRoutes.jsx:
 * <Route element={<ProtectedRoute />}>
 *   <Route path="/dashboard" element={<DashboardPage />} />
 * </Route>
 */
const ProtectedRoute = () => {
    const isAuthenticated = useSelector(selectIsAuthenticated);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;