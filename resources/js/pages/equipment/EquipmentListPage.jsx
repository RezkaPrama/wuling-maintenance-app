import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    fetchEquipments,
    fetchEquipmentCategories,
    deleteEquipment,
    setListFilters,
} from '../../features/equipment/equipmentSlice';
import PageToolbar from '../../components/PageToolbar';

const STATUS_BADGE = {
    active: 'badge-light-success',
    maintenance: 'badge-light-warning',
    inactive: 'badge-light-danger',
};

// Icon generik utk kartu kategori mesin — pakai yg sudah terbukti render
// di app ini (bi-cpu-fill dipakai jg di EquipmentDetailPage), supaya nggak
// kena masalah glyph icon yg nggak ada di font subset Metronic.
const CATEGORY_ICON = 'bi-cpu-fill';

export default function EquipmentListPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const filterGroup = searchParams.get('filter_group') || '';
    const filterCategory = searchParams.get('filter_category') || '';

    // ── MODE KATEGORI: filter_group ada, filter_category BELUM ada ──
    const isCategoryMode = Boolean(filterGroup) && !filterCategory;

    if (isCategoryMode) {
        return <CategoryCardsView filterGroup={filterGroup} onSelectCategory={(cat) => {
            setSearchParams({ filter_group: filterGroup, filter_category: cat });
        }} />;
    }

    return (
        <EquipmentTableView
            filterGroup={filterGroup}
            filterCategory={filterCategory}
            onBackToCategories={() => {
                if (filterGroup) {
                    setSearchParams({ filter_group: filterGroup });
                } else {
                    navigate('/admin');
                }
            }}
        />
    );
}

// ============================================================
// LEVEL 1 — Kartu kategori mesin (Friction Roller Bed, Air Hoist, dst)
// ============================================================
function CategoryCardsView({ filterGroup, onSelectCategory }) {
    const dispatch = useDispatch();
    const { items, status, filterGroup: loadedGroup } = useSelector((s) => s.equipment.categories);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        dispatch(fetchEquipmentCategories({ filter_group: filterGroup }));
    }, [dispatch, filterGroup]);

    const filteredItems = items.filter((cat) =>
        cat.machine_category.toLowerCase().includes(searchTerm.trim().toLowerCase())
    );

    return (
        <>
            <PageToolbar title={`Equipment — ${filterGroup}`} menuUtama="Menu Utama" menuItem="Equipment" />

            <div className="mb-5">
                <Link to="/admin" className="btn btn-sm btn-light">
                    <i className="bi bi-arrow-left me-1" />Kembali ke Menu Area
                </Link>
            </div>

            <div className="text-center mb-6">
                <h2 className="fw-bolder text-gray-900 mb-1">Pilih Jenis Mesin</h2>
                <div className="text-muted">Kategori equipment di area {filterGroup}</div>
            </div>

            <div className="d-flex justify-content-center mb-8">
                <div className="position-relative w-100" style={{ maxWidth: 420 }}>
                    <i className="bi bi-search position-absolute top-50 translate-middle-y text-muted" style={{ left: 14 }} />
                    <input
                        type="text"
                        className="form-control form-control-solid ps-11"
                        placeholder="Cari jenis mesin, misal: Friction Roller Bed..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {status === 'loading' && (
                <div className="d-flex justify-content-center py-15">
                    <div className="spinner-border text-primary" role="status" />
                </div>
            )}

            {status === 'succeeded' && items.length === 0 && (
                <div className="text-center text-muted py-15">
                    <i className="bi bi-inbox fs-2x mb-3 d-block" />
                    Belum ada equipment dengan kategori di area ini.
                </div>
            )}

            {status === 'succeeded' && items.length > 0 && filteredItems.length === 0 && (
                <div className="text-center text-muted py-15">
                    <i className="bi bi-search fs-2x mb-3 d-block" />
                    Tidak ada kategori yang cocok dengan "{searchTerm}".
                </div>
            )}

            {status === 'succeeded' && filteredItems.length > 0 && loadedGroup === filterGroup && (
                <>
                    <div className="text-muted fs-7 mb-4">
                        Menampilkan {filteredItems.length} dari {items.length} kategori
                    </div>
                    <div className="row g-5 g-xl-8">
                        {filteredItems.map((cat) => (
                            <div className="col-md-6 col-xl-4 col-xxl-3" key={cat.machine_category}>
                                <button
                                    type="button"
                                    onClick={() => onSelectCategory(cat.machine_category)}
                                    className="category-unit-card card shadow-lg card-flush w-100 h-100 text-start border-0 shadow-sm"
                                >
                                    <div className="card-body d-flex flex-column align-items-center text-center py-8">
                                        <div
                                            className="symbol symbol-60px symbol-circle bg-light-primary mb-4 d-flex align-items-center justify-content-center"
                                            style={{ width: 70, height: 70 }}
                                        >
                                            <i className={`bi ${CATEGORY_ICON} fs-2 text-primary`} />
                                        </div>
                                        <div className="fw-bolder fs-5 text-gray-900 mb-2">{cat.machine_category}</div>
                                        <div className="d-flex gap-2 flex-wrap justify-content-center">
                                            <span className="badge badge-light-dark">{cat.total_unit} unit</span>
                                            {Number(cat.total_maintenance) > 0 && (
                                                <span className="badge badge-light-warning">{cat.total_maintenance} maintenance</span>
                                            )}
                                            {Number(cat.total_inactive) > 0 && (
                                                <span className="badge badge-light-danger">{cat.total_inactive} inactive</span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <style>{`
                .category-unit-card {
                    transition: transform 0.15s ease, box-shadow 0.15s ease;
                    border-radius: 0.9rem;
                    cursor: pointer;
                }
                .category-unit-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 0.5rem 1.25rem rgba(0,0,0,0.1) !important;
                }
            `}</style>
        </>
    );
}

// ============================================================
// LEVEL 2 — Tabel unit equipment (kode, status, dst) dalam 1 kategori
// ============================================================
function EquipmentTableView({ filterGroup, filterCategory, onBackToCategories }) {
    const dispatch = useDispatch();
    const { items, pagination, stats, filters, status } = useSelector((s) => s.equipment.list);

    const [searchInput, setSearchInput] = useState(filters.search);

    // Sinkronkan filter_group & filter_category dari URL ke redux, sekali saat mount / berubah
    useEffect(() => {
        dispatch(setListFilters({ filter_group: filterGroup, filter_category: filterCategory }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterGroup, filterCategory]);

    useEffect(() => {
        dispatch(fetchEquipments({ ...filters, filter_group: filterGroup, filter_category: filterCategory, page: 1 }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.filter_status, filters.filter_location, filterGroup, filterCategory]);

    useEffect(() => {
        const t = setTimeout(() => {
            if (searchInput !== filters.search) {
                dispatch(setListFilters({ search: searchInput }));
                dispatch(fetchEquipments({ ...filters, search: searchInput, filter_group: filterGroup, filter_category: filterCategory, page: 1 }));
            }
        }, 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput]);

    const goToPage = (page) => {
        dispatch(fetchEquipments({ ...filters, filter_group: filterGroup, filter_category: filterCategory, page }));
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`Hapus equipment "${item.equipment_name}"?`)) return;
        const result = await dispatch(deleteEquipment(item.id));
        if (deleteEquipment.rejected.match(result)) {
            alert(result.payload);
        }
    };

    return (
        <>
            <PageToolbar
                title={filterCategory ? `Equipment — ${filterCategory}` : 'Equipment'}
                menuUtama="Menu Utama"
                menuItem="Equipment"
            />

            <div className="mb-5 d-flex align-items-center justify-content-between flex-wrap gap-2">
                <button type="button" className="btn btn-sm btn-light" onClick={onBackToCategories}>
                    <i className="bi bi-arrow-left me-1" />
                    {filterGroup ? `Kembali ke Kategori ${filterGroup}` : 'Kembali ke Menu Area'}
                </button>
                {filterGroup && (
                    <div className="text-muted fs-7">
                        <i className="bi bi-diagram-3 me-1" />{filterGroup}
                        {filterCategory && <> <i className="bi bi-chevron-right mx-1" style={{ fontSize: 10 }} />{filterCategory}</>}
                    </div>
                )}
            </div>

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