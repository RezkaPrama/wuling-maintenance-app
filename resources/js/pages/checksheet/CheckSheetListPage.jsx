import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
    fetchTemplates,
    toggleTemplateActive,
    deleteTemplate,
    setListFilters,
} from '../../features/checksheet/checkSheetSlice';
import PageToolbar from '../../components/PageToolbar';

const CYCLE_COLOR = { '6M': 'info', '1Y': 'primary', '2Y': 'warning' };

export default function CheckSheetListPage() {
    const dispatch = useDispatch();
    const { items, pagination, stats, filters, equipmentListForFilter, status } = useSelector(
        (s) => s.checksheet.list
    );

    const [searchInput, setSearchInput] = useState(filters.search);
    const [openDropdown, setOpenDropdown] = useState(null); // id template yang dropdown-nya lagi kebuka

    useEffect(() => {
        dispatch(fetchTemplates({ ...filters, page: 1 }));
    }, [filters.filter_cycle, filters.filter_equipment]);

    // Debounce search 400ms — sama pola dengan EquipmentListPage
    useEffect(() => {
        const t = setTimeout(() => {
            if (searchInput !== filters.search) {
                dispatch(setListFilters({ search: searchInput }));
                dispatch(fetchTemplates({ ...filters, search: searchInput, page: 1 }));
            }
        }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const goToPage = (page) => dispatch(fetchTemplates({ ...filters, page }));

    const resetFilters = () => {
        setSearchInput('');
        dispatch(setListFilters({ search: '', filter_cycle: 'all', filter_equipment: '' }));
        dispatch(fetchTemplates({ search: '', filter_cycle: 'all', filter_equipment: '', page: 1 }));
    };

    const handleToggle = (tpl) => {
        dispatch(toggleTemplateActive(tpl.id));
        setOpenDropdown(null);
    };

    const handleDelete = async (tpl) => {
        setOpenDropdown(null);
        const confirmed = window.Swal
            ? await window.Swal.fire({
                  title: 'Hapus template ini?',
                  text: 'Tindakan tidak dapat dibatalkan.',
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonText: 'Ya, Hapus',
                  cancelButtonText: 'Batal',
                  buttonsStyling: false,
                  customClass: { confirmButton: 'btn btn-danger me-3', cancelButton: 'btn btn-light' },
              }).then((r) => r.isConfirmed)
            : window.confirm('Hapus template ini? Tindakan tidak dapat dibatalkan.');

        if (!confirmed) return;

        const result = await dispatch(deleteTemplate(tpl.id));
        if (deleteTemplate.rejected.match(result)) {
            alert(result.payload); // contoh: sudah dipakai di N maintenance record
        }
    };

    const activeFilterCount =
        (filters.search ? 1 : 0) +
        (filters.filter_cycle && filters.filter_cycle !== 'all' ? 1 : 0) +
        (filters.filter_equipment ? 1 : 0);

    return (
        <>
            <PageToolbar title="Check Sheet" menuUtama="Menu Utama" menuItem="Check Sheet" />

            <div className="d-flex align-items-center justify-content-between mb-6">
                <div>
                    <h1 className="fs-2 fw-bold text-gray-900 mb-1">Check Sheet Templates</h1>
                    <span className="text-muted fs-6">Kelola template check sheet untuk pelaksanaan PM</span>
                </div>
                <Link to="/admin/check-sheet/templates/create" className="btn btn-primary">
                    <i className="bi bi-plus-circle me-2"></i>Buat Template Baru
                </Link>
            </div>

            {/* ── Stat Cards ── */}
            <div className="row g-4 mb-6">
                {[
                    { label: 'Total Template', value: stats?.total ?? 0, icon: 'bi-file-earmark-check', color: 'primary' },
                    { label: 'Aktif', value: stats?.active ?? 0, icon: 'bi-toggle-on', color: 'success' },
                    { label: 'Cycle 6 Bulan', value: stats?.cycle_6m ?? 0, icon: 'bi-calendar2-half', color: 'info' },
                    { label: 'Cycle 1 Tahun', value: stats?.cycle_1y ?? 0, icon: 'bi-calendar2', color: 'warning' },
                    { label: 'Cycle 2 Tahun', value: stats?.cycle_2y ?? 0, icon: 'bi-calendar2-range', color: 'danger' },
                ].map((sc) => (
                    <div className="col-6 col-lg" key={sc.label}>
                        <div className="card card-flush border-0 shadow-lg h-100">
                            <div className="card-body d-flex align-items-center gap-3 p-5">
                                <div className="symbol symbol-45px">
                                    <div className={`symbol-label bg-light-${sc.color}`}>
                                        <i className={`bi ${sc.icon} fs-3 text-${sc.color}`}></i>
                                    </div>
                                </div>
                                <div>
                                    <div className="fs-2 fw-bold text-gray-900">{Number(sc.value).toLocaleString('id-ID')}</div>
                                    <div className="fs-7 text-muted">{sc.label}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filter + Table ── */}
            <div className="card card-flush border-0 shadow-lg">
                <div className="card-header border-0 pt-6 flex-wrap gap-3">
                    <div className="card-title flex-wrap gap-2">
                        <div className="d-flex gap-2 flex-wrap align-items-center">
                            <div className="input-group input-group-sm" style={{ width: 220 }}>
                                <span className="input-group-text border-0 bg-light">
                                    <i className="bi bi-search text-muted"></i>
                                </span>
                                <input
                                    type="text"
                                    className="form-control border-0 bg-light"
                                    placeholder="Cari nama, doc number, equipment..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                />
                            </div>
                            <select
                                className="form-select form-select-sm w-auto"
                                value={filters.filter_cycle}
                                onChange={(e) => dispatch(setListFilters({ filter_cycle: e.target.value }))}
                            >
                                <option value="all">Semua Cycle</option>
                                <option value="6M">6 Bulan</option>
                                <option value="1Y">1 Tahun</option>
                                <option value="2Y">2 Tahun</option>
                            </select>
                            <select
                                className="form-select form-select-sm w-auto"
                                value={filters.filter_equipment}
                                onChange={(e) => dispatch(setListFilters({ filter_equipment: e.target.value }))}
                            >
                                <option value="">Semua Equipment</option>
                                {equipmentListForFilter.map((eq) => (
                                    <option key={eq.id} value={eq.id}>
                                        {eq.equipment_code} — {eq.equipment_name}
                                    </option>
                                ))}
                            </select>
                            {activeFilterCount > 0 && (
                                <button type="button" className="btn btn-sm btn-light-danger" onClick={resetFilters}>
                                    <i className="bi bi-x-circle me-1"></i>Reset
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="card-body pt-0">
                    {status === 'loading' && (
                        <div className="text-center py-12 text-muted">Memuat data...</div>
                    )}

                    {status === 'succeeded' && items.length === 0 && (
                        <div className="text-center py-12">
                            <i className="bi bi-file-earmark-x fs-1 text-muted mb-3 d-block"></i>
                            <p className="text-muted mb-3">Belum ada template check sheet.</p>
                            <Link to="/admin/check-sheet/templates/create" className="btn btn-primary">
                                <i className="bi bi-plus me-1"></i>Buat Template Pertama
                            </Link>
                        </div>
                    )}

                    {status === 'succeeded' && items.length > 0 && (
                        <>
                            <div className="table-responsive">
                                <table className="table table-row-dashed table-row-gray-200 align-middle gs-0 gy-3">
                                    <thead>
                                        <tr className="fw-bold text-muted fs-7 text-uppercase">
                                            <th className="ps-4">Template</th>
                                            <th>Equipment</th>
                                            <th>PM Cycle</th>
                                            <th className="text-center">Items</th>
                                            <th className="text-center">Status</th>
                                            <th>Dibuat</th>
                                            <th className="text-end pe-4">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((tpl) => (
                                            <tr key={tpl.id}>
                                                <td className="ps-4">
                                                    <Link
                                                        to={`/admin/check-sheet/templates/${tpl.id}`}
                                                        className="fw-bold text-gray-800 text-hover-primary d-block"
                                                    >
                                                        {tpl.template_name}
                                                    </Link>
                                                    <span className="text-muted fs-8">
                                                        <i className="bi bi-hash"></i>{tpl.doc_number}
                                                    </span>
                                                    {tpl.default_for_etm_group && (
                                                        <div>
                                                            <span className="badge badge-light-success fs-9 mt-1">
                                                                <i className="bi bi-star-fill me-1"></i>
                                                                Default: {tpl.default_for_etm_group}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="fw-semibold text-gray-700">{tpl.equipment_name}</div>
                                                    <div className="text-muted fs-8">
                                                        {tpl.equipment_code}
                                                        {tpl.etm_group && <> · {tpl.etm_group}</>}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge badge-light-${CYCLE_COLOR[tpl.pm_cycle] || 'secondary'} fw-semibold px-3`}>
                                                        {tpl.pm_cycle}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <span className="fw-bold text-gray-800">{tpl.item_count}</span>
                                                    <span className="text-muted fs-8"> item</span>
                                                </td>
                                                <td className="text-center">
                                                    {tpl.is_active ? (
                                                        <span className="badge badge-light-success fw-semibold">Aktif</span>
                                                    ) : (
                                                        <span className="badge badge-light-secondary fw-semibold">Nonaktif</span>
                                                    )}
                                                </td>
                                                <td className="text-muted fs-7">
                                                    {tpl.created_at
                                                        ? new Date(tpl.created_at).toLocaleDateString('id-ID', {
                                                              day: '2-digit', month: 'short', year: 'numeric',
                                                          })
                                                        : '—'}
                                                </td>
                                                <td className="text-end pe-4">
                                                    <div className="d-flex justify-content-end gap-1 position-relative">
                                                        <Link
                                                            to={`/admin/check-sheet/templates/${tpl.id}`}
                                                            className="btn btn-sm btn-light-primary py-1 px-3"
                                                        >
                                                            <i className="bi bi-eye me-1"></i>Detail
                                                        </Link>
                                                        <Link
                                                            to={`/admin/check-sheet/templates/${tpl.id}/edit`}
                                                            className="btn btn-sm btn-light-warning py-1 px-3"
                                                        >
                                                            <i className="bi bi-pencil me-1"></i>Edit
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-light py-1 px-2"
                                                            onClick={() => setOpenDropdown(openDropdown === tpl.id ? null : tpl.id)}
                                                        >
                                                            <i className="bi bi-three-dots-vertical"></i>
                                                        </button>
                                                        {openDropdown === tpl.id && (
                                                            <div
                                                                className="menu menu-sub menu-sub-dropdown show position-absolute end-0 top-100 mt-1 p-2 bg-white shadow rounded"
                                                                style={{ zIndex: 10, minWidth: 180 }}
                                                            >
                                                                <div
                                                                    className="menu-item d-flex align-items-center px-3 py-2 cursor-pointer text-hover-primary"
                                                                    onClick={() => handleToggle(tpl)}
                                                                >
                                                                    <i className={`bi bi-toggle-${tpl.is_active ? 'off' : 'on'} me-2`}></i>
                                                                    {tpl.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                                </div>
                                                                <hr className="my-1" />
                                                                <div
                                                                    className="menu-item d-flex align-items-center px-3 py-2 cursor-pointer text-danger"
                                                                    onClick={() => handleDelete(tpl)}
                                                                >
                                                                    <i className="bi bi-trash me-2"></i>Hapus
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {pagination && pagination.last_page > 1 && (
                                <div className="d-flex justify-content-between align-items-center mt-4">
                                    <div className="text-muted fs-7">
                                        Halaman {pagination.current_page} dari {pagination.last_page} · {pagination.total} template
                                    </div>
                                    <div className="d-flex gap-2">
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
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}