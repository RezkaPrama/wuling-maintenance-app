import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchEquipments, deleteEquipment, setListFilters } from '../../features/equipment/equipmentSlice';
import PageToolbar from '../../components/PageToolbar';

// Badge warna status — samain dengan konvensi Metronic (light-*)
const STATUS_BADGE = {
    active: 'badge-light-success',
    maintenance: 'badge-light-warning',
    inactive: 'badge-light-danger',
};

export default function EquipmentListPage() {
    const dispatch = useDispatch();
    const { items, pagination, stats, filters, status } = useSelector((s) => s.equipment.list);

    // State lokal untuk input search supaya tidak nge-fetch di setiap keystroke
    const [searchInput, setSearchInput] = useState(filters.search);

    useEffect(() => {
        dispatch(fetchEquipments({ ...filters, page: 1 }));
    }, [filters.filter_status, filters.filter_group, filters.filter_location]);

    // Debounce search 400ms
    useEffect(() => {
        const t = setTimeout(() => {
            if (searchInput !== filters.search) {
                dispatch(setListFilters({ search: searchInput }));
                dispatch(fetchEquipments({ ...filters, search: searchInput, page: 1 }));
            }
        }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const goToPage = (page) => {
        dispatch(fetchEquipments({ ...filters, page }));
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`Hapus equipment "${item.equipment_name}"?`)) return;
        const result = await dispatch(deleteEquipment(item.id));
        if (deleteEquipment.rejected.match(result)) {
            // Contoh: masih ada maintenance record -> backend balikin 409 + message
            alert(result.payload);
        }
    };

    return (
        <>
            <PageToolbar title="Equipment" menuUtama="Menu Utama" menuItem="Equipment" />

            {/* ── Stat cards ── */}
            <div className="row g-4 mb-6">
                <StatCard label="Active" value={stats.total_active} tone="success" />
                <StatCard label="Maintenance" value={stats.total_maintenance} tone="warning" />
                <StatCard label="Inactive" value={stats.total_inactive} tone="danger" />
                <StatCard label="Jadwal Overdue" value={stats.total_overdue} tone="danger" />
            </div>

            <div className="card">
                <div className="card-header align-items-center">
                    <div className="d-flex align-items-center gap-3">
                        <input
                            type="text"
                            className="form-control form-control-sm w-250px"
                            placeholder="Cari kode / nama / lokasi..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                        <select
                            className="form-select form-select-sm w-150px"
                            value={filters.filter_status}
                            onChange={(e) => dispatch(setListFilters({ filter_status: e.target.value }))}
                        >
                            <option value="">Semua Status</option>
                            <option value="active">Active</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <div className="card-toolbar">
                        <Link to="/admin/equipment/create" className="btn btn-primary btn-sm">
                            + Tambah Equipment
                        </Link>
                    </div>
                </div>

                <div className="card-body pt-0">
                    <div className="table-responsive">
                        <table className="table align-middle table-row-dashed fs-6 gy-4">
                            <thead>
                                <tr className="text-start text-muted fw-bold fs-7 text-uppercase gs-0">
                                    <th>Kode</th>
                                    <th>Nama Equipment</th>
                                    <th>ETM Group</th>
                                    <th>Lokasi</th>
                                    <th>Next Maintenance</th>
                                    <th>Status</th>
                                    <th className="text-end">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {status === 'loading' && (
                                    <tr><td colSpan={7} className="text-center py-8">Memuat data...</td></tr>
                                )}
                                {status === 'succeeded' && items.length === 0 && (
                                    <tr><td colSpan={7} className="text-center py-8 text-muted">Belum ada equipment.</td></tr>
                                )}
                                {items.map((eq) => (
                                    <tr key={eq.id}>
                                        <td className="fw-bold">{eq.equipment_code}</td>
                                        <td>
                                            <Link to={`/admin/equipment/${eq.id}`} className="text-gray-800 text-hover-primary fw-bold">
                                                {eq.equipment_name}
                                            </Link>
                                            <div className="text-muted fs-7">{eq.pm_number}</div>
                                        </td>
                                        <td>{eq.etm_group}</td>
                                        <td>{eq.location || '-'}</td>
                                        <td>{eq.next_maintenance || '-'}</td>
                                        <td>
                                            <span className={`badge ${STATUS_BADGE[eq.status] || 'badge-light'}`}>
                                                {eq.status}
                                            </span>
                                        </td>
                                        <td className="text-end">
                                            <Link
                                                to={`/admin/equipment/${eq.id}/edit`}
                                                className="btn btn-sm btn-light-primary me-2"
                                            >
                                                Edit
                                            </Link>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-light-danger"
                                                onClick={() => handleDelete(eq)}
                                            >
                                                Hapus
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Pagination sederhana ── */}
                    {pagination && pagination.last_page > 1 && (
                        <div className="d-flex justify-content-end gap-2 mt-4">
                            {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => goToPage(p)}
                                    className={`btn btn-sm ${p === pagination.current_page ? 'btn-primary' : 'btn-light'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function StatCard({ label, value, tone }) {
    return (
        <div className="col-md-3">
            <div className={`card card-flush bg-light-${tone}`}>
                <div className="card-body py-4">
                    <div className={`fs-2 fw-bold text-${tone}`}>{value}</div>
                    <div className="text-muted fs-7">{label}</div>
                </div>
            </div>
        </div>
    );
}