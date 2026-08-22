import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import CategoryDashboardPage from '../pages/dashboard/CategoryDashboardPage';
import EquipmentListPage from '../pages/equipment/EquipmentListPage';
import EquipmentFormPage from '../pages/equipment/EquipmentFormPage';
import EquipmentDetailPage from '../pages/equipment/EquipmentDetailPage';
import CheckSheetListPage from '../pages/checksheet/CheckSheetListPage';
import CheckSheetFormPage from '../pages/checksheet/CheckSheetFormPage';
import CheckSheetDetailPage from '../pages/checksheet/CheckSheetDetailPage';
import ScheduleListPage from '../pages/schedule/ScheduleListPage';
import ScheduleFormPage from '../pages/schedule/ScheduleFormPage';

// ── Guard sederhana: kalau belum ada token Sanctum, lempar balik ke halaman login Blade ──
// FIX: TIDAK lagi membungkus dengan <AdminLayout> — sidebar/topbar/footer
// Metronic sekarang di-render penuh oleh app.blade.php (Blade asli),
// bukan reimplementasi React. React cukup return konten halamannya saja,
// yang akan menempati <div id="root"> di dalam layout Blade tersebut.
function RequireAuth({ children }) {
    const token = useSelector((s) => s.auth.token);
    if (!token) {
        window.location.href = '/';
        return null;
    }
    return children;
}

export default function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/admin/dashboard"
                element={<RequireAuth><CategoryDashboardPage /></RequireAuth>}
            />
            <Route
                path="/admin/equipment"
                element={<RequireAuth><EquipmentListPage /></RequireAuth>}
            />
            <Route
                path="/admin/equipment/create"
                element={<RequireAuth><EquipmentFormPage /></RequireAuth>}
            />
            <Route
                path="/admin/equipment/:id/edit"
                element={<RequireAuth><EquipmentFormPage /></RequireAuth>}
            />
            <Route path="/admin/equipment/:id" element={<RequireAuth><EquipmentDetailPage /></RequireAuth>} />

            {/* CHECK SHEET TEMPLATE */}
            <Route
                path="/admin/check-sheet/templates"
                element={<RequireAuth><CheckSheetListPage /></RequireAuth>}
            />
            <Route
                path="/admin/check-sheet/templates/create"
                element={<RequireAuth><CheckSheetFormPage /></RequireAuth>}
            />
            <Route
                path="/admin/check-sheet/templates/:id/edit"
                element={<RequireAuth><CheckSheetFormPage /></RequireAuth>}
            />
            <Route
                path="/admin/check-sheet/templates/:id"
                element={<RequireAuth><CheckSheetDetailPage /></RequireAuth>}
            />

            {/* SCHEDULE PM */}
            <Route path="/admin/schedules" element={<RequireAuth><ScheduleListPage /></RequireAuth>} />

            <Route path="/admin/schedules/create" element={<RequireAuth><ScheduleFormPage /></RequireAuth>} />
            <Route path="/admin/schedules/:id/edit" element={<RequireAuth><ScheduleFormPage /></RequireAuth>} />

            {/* Fallback: sekarang landing page-nya Dashboard kategori, bukan langsung Equipment */}
            <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
    );
}