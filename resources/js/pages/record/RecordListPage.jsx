import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchRecords, setListFilters } from '../../features/record/recordSlice';
import PageToolbar from '../../components/PageToolbar';

const STATUS_MAP = {
    in_progress: { badge: 'badge-light-warning', label: 'In Progress' },
    completed: { badge: 'badge-light-info', label: 'Completed' },
    validated: { badge: 'badge-light-success', label: 'Validated' },
    rejected: { badge: 'badge-light-danger', label: 'Rejected' },
};

export default function RecordListPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { items, pagination, stats, filters, status, error } = useSelector((s) => s.record.list);

    // Input search lokal -- di-debounce sebelum masuk ke filters redux,
    // supaya enggak nembak API tiap ketikan huruf.
    const [searchInput, setSearchInput] = useState(filters.search);

    useEffect(() => {
        const t = setTimeout(() => {
            if (searchInput !== filters.search) {
                dispatch(setListFilters({ search: searchInput }));
            }
        }, 500);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput]);

    useEffect(() => {
        dispatch(fetchRecords({ ...filters, page: 1 }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.search, filters.filter_status, filters.filter_cycle, filters.filter_month]);

    const goToPage = (page) => dispatch(fetchRecords({ ...filters, page }));

    const handleResetFilters = () => {
        setSearchInput('');
        dispatch(setListFilters({ search: '', filter_status: '', filter_cycle: '', filter_month: '' }));
    };

    const hasActiveFilters = filters.search || filters.filter_status || filters.filter_cycle || filters.filter_month;

    return (
        <>
            <PageToolbar title="Maintenance Record" menuUtama="Menu Utama" menuItem="Maintenance Record" />

            <div className="d-flex align-items-center justify-content-between mb-6 flex-wrap gap-3">
                <div>
                    <h1 className="fs-2 fw-bold text-gray-900 mb-1">Maintenance Record</h1>
                    <span className="text-muted fs-6">Riwayat pengerjaan PM — dari isi checklist sampai validasi</span>
                </div>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => navigate('/admin/records/create')}>
                    <i className="bi bi-plus-circle me-1" />Buat Record Baru
                </button>
            </div>

            {/* ── STAT CARDS ── */}
            <div className="row g-4 mb-6">
                {[
                    { label: 'Total Record', value: stats.total, icon: 'bi-clipboard-data', color: 'primary' },
                    { label: 'In Progress', value: stats.in_progress, icon: 'bi-hourglass-split', color: 'warning' },
                    { label: 'Completed', value: stats.completed, icon: 'bi-check2-circle', color: 'info' },
                    { label: 'Validated', value: stats.validated, icon: 'bi-patch-check', color: 'success' },
                    { label: 'Rejected', value: stats.rejected, icon: 'bi-x-circle', color: 'danger' },
                ].map((c) => (
                    <div className="col-6 col-lg" key={c.label}>
                        <div className="card card-flush h-100 border-0 shadow-lg">
                            <div className="card-body d-flex align-items-center gap-4 p-5">
                                <div className="symbol symbol-50px">
                                    <div className={`symbol-label bg-light-${c.color}`}>
                                        <i className={`bi ${c.icon} fs-2 text-${c.color}`} />
                                    </div>
                                </div>
                                <div>
                                    <div className="fs-2 fw-bold text-gray-900">{(c.value ?? 0).toLocaleString('id-ID')}</div>
                                    <div className="fs-7 text-muted">{c.label}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── FILTER + TABEL ── */}
            <div className="card card-flush border-0 shadow-lg mb-6">
                <div className="card-header border-0 pt-6 flex-wrap gap-3">
                    <div className="card-title">
                        <h3 className="fw-bold fs-4 mb-0">
                            <i className="bi bi-list-check me-2 text-primary" />Daftar Record
                        </h3>
                    </div>
                    <div className="card-toolbar">
                        <div className="d-flex flex-wrap gap-2 align-items-center">
                            <div className="position-relative">
                                <i className="bi bi-search position-absolute" style={{ left: 10, top: 8, fontSize: 12, color: '#a1a5b7' }} />
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    style={{ paddingLeft: 28, width: 200 }}
                                    placeholder="Cari no. record / equipment / teknisi..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                />
                            </div>
                            <select
                                className="form-select form-select-sm w-auto"
                                value={filters.filter_status}
                                onChange={(e) => dispatch(setListFilters({ filter_status: e.target.value }))}
                            >
                                <option value="">Semua Status</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="validated">Validated</option>
                                <option value="rejected">Rejected</option>
                            </select>
                            <select
                                className="form-select form-select-sm w-auto"
                                value={filters.filter_cycle}
                                onChange={(e) => dispatch(setListFilters({ filter_cycle: e.target.value }))}
                            >
                                <option value="">Semua Cycle</option>
                                <option value="1M">1 Bulan</option>
                                <option value="3M">3 Bulan</option>
                                <option value="6M">6 Bulan</option>
                                <option value="1Y">1 Tahun</option>
                            </select>
                            <input
                                type="month"
                                className="form-control form-control-sm w-auto"
                                value={filters.filter_month}
                                onChange={(e) => dispatch(setListFilters({ filter_month: e.target.value }))}
                            />
                            {hasActiveFilters && (
                                <button type="button" className="btn btn-sm btn-light-danger" onClick={handleResetFilters}>
                                    <i className="bi bi-x-circle me-1" />Reset
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="card-body pt-0">
                    {status === 'failed' && (
                        <div className="alert alert-danger d-flex align-items-center p-4 mb-5">
                            <i className="bi bi-x-circle fs-2 me-3" />
                            <div>
                                <div className="fw-bold">Gagal memuat data record</div>
                                <div className="fs-7">{error}</div>
                            </div>
                        </div>
                    )}

                    {status === 'loading' && (
                        <div className="text-center py-10 text-muted">Memuat data...</div>
                    )}

                    {status === 'succeeded' && items.length === 0 && (
                        <div className="text-center py-10">
                            <i className="bi bi-clipboard-x fs-1 text-muted mb-3 d-block" />
                            <p className="text-muted">Tidak ada maintenance record yang ditemukan.</p>
                        </div>
                    )}

                    {items.length > 0 && (
                        <>
                            <div className="table-responsive">
                                <table className="table table-row-dashed table-row-gray-200 align-middle gs-0 gy-3">
                                    <thead>
                                        <tr className="fw-bold text-muted fs-7 text-uppercase">
                                            <th className="ps-4">No. Record</th>
                                            <th>Equipment</th>
                                            <th>PM Cycle</th>
                                            <th>Tanggal</th>
                                            <th>Teknisi</th>
                                            <th>Progress</th>
                                            <th>Status</th>
                                            <th className="text-end pe-4">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((r) => {
                                            const st = STATUS_MAP[r.status] || { badge: 'badge-light', label: r.status };
                                            const canWork = ['in_progress', 'rejected'].includes(r.status);
                                            return (
                                                <tr key={r.id}>
                                                    <td className="ps-4">
                                                        <Link to={`/admin/records/${r.id}`} className="fw-bold text-gray-800 text-hover-primary d-block">
                                                            {r.record_number}
                                                        </Link>
                                                        <span className="text-muted fs-8">{r.template_name || '-'}</span>
                                                    </td>
                                                    <td>
                                                        <div className="fw-semibold text-gray-800 fs-7">{r.equipment_name}</div>
                                                        <span className="text-muted fs-8">
                                                            {r.equipment_code}{r.etm_group ? ` · ${r.etm_group}` : ''}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-light-primary fw-semibold">{r.pm_cycle || '-'}</span>
                                                    </td>
                                                    <td className="text-muted fs-7">
                                                        {r.maintenance_date ? new Date(r.maintenance_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                        <div className="fs-8">{r.start_time}{r.end_time ? ` – ${r.end_time}` : ''}</div>
                                                    </td>
                                                    <td className="text-muted fs-7">{r.technician_name || '-'}</td>
                                                    <td style={{ minWidth: 110 }}>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="progress h-6px flex-grow-1" style={{ background: '#eff2f5' }}>
                                                                <div
                                                                    className={`progress-bar ${r.completion_percentage >= 100 ? 'bg-success' : 'bg-primary'}`}
                                                                    style={{ width: `${r.completion_percentage || 0}%` }}
                                                                />
                                                            </div>
                                                            <span className="fs-8 text-muted">{r.completion_percentage || 0}%</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${st.badge} fw-semibold px-3 py-2`}>{st.label}</span>
                                                    </td>
                                                    <td className="text-end pe-4">
                                                        <div className="d-flex justify-content-end gap-2">
                                                            <Link to={`/admin/records/${r.id}`} className="btn btn-sm btn-light-primary">
                                                                <i className="bi bi-eye me-1" />Detail
                                                            </Link>
                                                            {canWork && (
                                                                <Link to={`/admin/records/${r.id}/work`} className="btn btn-sm btn-warning">
                                                                    <i className="bi bi-pencil-square me-1" />
                                                                    {r.status === 'rejected' ? 'Perbaiki' : 'Lanjutkan'}
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {pagination && pagination.last_page > 1 && (
                                <div className="d-flex justify-content-between align-items-center mt-4">
                                    <div className="text-muted fs-7">
                                        Menampilkan {pagination.from}–{pagination.to} dari {pagination.total} record
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