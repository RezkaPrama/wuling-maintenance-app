import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated } from '../store/slices/authSlice'

// Layouts
import Layout from '../components/Layout'

// Pages
import Login      from '../pages/LoginPage'
import Dashboard  from '../pages/Dashboard'
import EquipmentList   from '../pages/equipment/EquipmentList'
import MaintenanceList from '../pages/maintenance/MaintenanceList'

// ─── Private Route ────────────────────────────────────────────
// Cek token JWT — kalau belum login redirect ke /login
function PrivateRoute({ children }) {
    const isAuthenticated = useSelector(selectIsAuthenticated)
    return isAuthenticated
        ? children
        : <Navigate to="/login" replace />
}

// ─── Public Route ─────────────────────────────────────────────
// Kalau sudah login dan akses /login → redirect ke dashboard
function PublicRoute({ children }) {
    const isAuthenticated = useSelector(selectIsAuthenticated)
    return !isAuthenticated
        ? children
        : <Navigate to="/" replace />
}

// ─── App Routes ───────────────────────────────────────────────
export default function AppRoutes() {
    return (
        <Routes>

            {/* Public — hanya bisa diakses sebelum login */}
            <Route path="/login" element={
                <PublicRoute>
                    <Login />
                </PublicRoute>
            }/>

            {/* Private — wajib login dulu */}
            <Route path="/" element={
                <PrivateRoute>
                    <Layout>
                        <Dashboard />
                    </Layout>
                </PrivateRoute>
            }/>

            <Route path="/equipment" element={
                <PrivateRoute>
                    <Layout>
                        <EquipmentList />
                    </Layout>
                </PrivateRoute>
            }/>

            <Route path="/maintenance" element={
                <PrivateRoute>
                    <Layout>
                        <MaintenanceList />
                    </Layout>
                </PrivateRoute>
            }/>

            {/* Redirect semua URL tidak dikenal ke dashboard */}
            <Route path="*" element={<Navigate to="/" replace />}/>

        </Routes>
    )
}