import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { fetchEquipmentDetail, deleteEquipment, clearDetail } from '../../features/equipment/equipmentSlice';
import PageToolbar from '../../components/PageToolbar';
import api from '../../lib/axiosInstance';

// ── Badge warna, disamakan dengan konvensi Metronic (badge-light-*) ──
const STATUS_BADGE = {
    active: 'badge-light-success',
    maintenance: 'badge-light-warning',
    inactive: 'badge-light-danger',
};

const SCHEDULE_BADGE = {
    overdue: 'badge-danger',
    due: 'badge-warning',
    completed: 'badge-success',
};

const RECORD_STATUS_MAP = {
    validated: ['success', 'Validated'],
    completed: ['primary', 'Completed'],
    in_progress: ['warning', 'In Progress'],
    rejected: ['danger', 'Rejected'],
};

// ── Helper tanggal, pengganti Carbon::parse()->format('d M Y') ──
function formatDate(value) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
}

// ── Helper pengganti Carbon diffForHumans() versi sederhana ──
function diffForHumans(value) {
    if (!value) return '';
    const diffMs = new Date(value).getTime() - Date.now();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'hari ini';
    if (diffDays > 0) return `${diffDays} hari lagi`;
    return `${Math.abs(diffDays)} hari lalu`;
}

const TABS = [
    { key: 'info', label: 'Informasi', icon: 'bi-info-circle' },
    { key: 'schedule', label: 'Jadwal PM', icon: 'bi-calendar3' },
    { key: 'history', label: 'Riwayat Maintenance', icon: 'bi-clock-history' },
    { key: 'chart', label: 'Statistik', icon: 'bi-bar-chart' },
];

export default function EquipmentDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { data, status, error } = useSelector((s) => s.equipment.detail);

    const [activeTab, setActiveTab] = useState('info');
    const [historyFilters, setHistoryFilters] = useState({ filter_year: '', filter_status: 'all' });
    const [showPrintModal, setShowPrintModal] = useState(false);

    // ── Load detail — dipanggil ulang tiap filter riwayat / halaman berubah ──
    const loadDetail = useCallback((params = {}) => {
        dispatch(fetchEquipmentDetail({ id, params }));
    }, [dispatch, id]);

    useEffect(() => {
        loadDetail();
        return () => dispatch(clearDetail());
    }, [loadDetail, dispatch]);

    const handleFilterChange = (patch) => {
        const next = { ...historyFilters, ...patch };
        setHistoryFilters(next);
        loadDetail({ ...next, page: 1 });
    };

    const handleResetFilters = () => {
        setHistoryFilters({ filter_year: '', filter_status: 'all' });
        loadDetail();
    };

    const goToHistoryPage = (page) => {
        loadDetail({ ...historyFilters, page });
    };

    const handleDelete = async () => {
        if (!data?.equipment) return;
        if (!window.confirm(`Hapus equipment "${data.equipment.equipment_name}"?`)) return;
        const result = await dispatch(deleteEquipment(id));
        if (deleteEquipment.fulfilled.match(result)) {
            navigate('/admin/equipment');
        } else {
            alert(result.payload);
        }
    };

    // ── Download QR — pakai axios blob + auth header, bukan <a href> langsung ──
    // (lihat catatan di EquipmentController@downloadQr: butuh token JWT/Sanctum)
    const handleDownloadQr = async () => {
        try {
            // NOTE: sesuaikan path ini kalau nama route API-nya beda
            const response = await api.get(`/v1/equipment/${id}/download-qr`, { responseType: 'blob' });
            const blobUrl = URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `QR-${data.equipment.equipment_code}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            alert('Gagal mengunduh QR Code.');
        }
    };

    if (status === 'loading' && !data) {
        return (
            <div className="d-flex justify-content-center py-20">
                <div className="spinner-border text-primary" role="status" />
            </div>
        );
    }

    if (status === 'failed' && !data) {
        return (
            <div className="alert alert-danger d-flex align-items-center p-4">
                <i className="bi bi-x-circle fs-2 text-danger me-3" />
                <span>{error || 'Equipment tidak ditemukan.'}</span>
            </div>
        );
    }

    if (!data) return null;

    const { equipment, specifications, schedules, history, stats, chart, qr_code: qrCode } = data;
    // NOTE: 'history.data' adalah objek paginate() Laravel, jadi ada 'data.data' (baris) — bukan typo
    const historyRows = history.data.data;
    const historyPagination = {
        current_page: history.data.current_page,
        last_page: history.data.last_page,
        total: history.data.total,
        from: history.data.from,
        to: history.data.to,
    };

    const chartData = chart.labels.map((label, i) => ({
        year: label,
        total: chart.total[i],
        validated: chart.validated[i],
    }));

    return (
        <>
            <PageToolbar
                title={`Detail Equipment — ${equipment.equipment_name}`}
                menuUtama="Menu Utama"
                menuItem="Equipment"
            />

            <div className="mb-5 d-flex align-items-center justify-content-between">
                <a href="/admin/equipment" className="btn btn-sm btn-light" onClick={(e) => { e.preventDefault(); navigate('/admin/equipment'); }}>
                    <i className="bi bi-arrow-left me-1" />Kembali ke Daftar
                </a>
                <div className="d-flex gap-2">
                    <button
                        type="button"
                        className="btn btn-sm btn-warning"
                        onClick={() => navigate(`/admin/equipment/${id}/edit`)}
                    >
                        <i className="bi bi-pencil-square me-1" />Edit
                    </button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={handleDelete}>
                        <i className="bi bi-trash3 me-1" />Hapus
                    </button>
                </div>
            </div>

            {/* ═══ HEADER CARD ═══ */}
            <div className="card shadow-lg mb-6">
                <div className="card-body pt-8 pb-0">
                    <div className="d-flex flex-wrap flex-sm-nowrap gap-5">

                        <div className="flex-shrink-0">
                            <div className="symbol symbol-100px symbol-lg-120px position-relative">
                                <span className={`symbol-label bg-light-${statusTone(equipment.status)}`}>
                                    <i className={`bi bi-cpu-fill fs-4x text-${statusTone(equipment.status)}`} />
                                </span>
                                <div
                                    className={`position-absolute translate-middle start-100 top-100 border border-4 border-white rounded-circle h-15px w-15px ms-n3 mt-n3 bg-${statusTone(equipment.status)}`}
                                />
                            </div>
                        </div>

                        <div className="flex-grow-1">
                            <div className="d-flex align-items-center mb-2 flex-wrap gap-2">
                                <h2 className="text-gray-900 fw-bolder me-2 mb-0">{equipment.equipment_name}</h2>
                                <span className={`badge ${STATUS_BADGE[equipment.status] || 'badge-light'} fw-bolder fs-8 px-3 py-2 text-uppercase`}>
                                    {equipment.status}
                                </span>
                            </div>
                            <div className="d-flex flex-wrap gap-4 fw-bold fs-7 text-gray-400 mb-4">
                                <span><i className="bi bi-hash me-1" />{equipment.equipment_code}</span>
                                <span><i className="bi bi-file-text me-1" />PM: {equipment.pm_number}</span>
                                {equipment.tis_number && (
                                    <span><i className="bi bi-upc me-1" />TIS: {equipment.tis_number}</span>
                                )}
                                <span><i className="bi bi-diagram-3 me-1" />{equipment.etm_group}</span>
                                {equipment.location && (
                                    <span><i className="bi bi-geo-alt me-1" />{equipment.location}</span>
                                )}
                            </div>
                            <div className="d-flex flex-wrap gap-5 mb-4">
                                <MiniStat value={stats.total_pm_all} label="Total PM Record" color="text-gray-800" />
                                <MiniStat value={stats.total_pm_done} label="PM Selesai" color="text-success" />
                                <MiniStat
                                    value={stats.last_record ? formatDate(stats.last_record.maintenance_date) : '-'}
                                    label="PM Terakhir"
                                    color="text-primary"
                                    isText
                                />
                                <MiniStat value={schedules.length} label="Total Schedule" color="text-gray-800" />
                            </div>
                        </div>

                        {/* ── QR CODE PANEL ── */}
                        <div className="flex-shrink-0" style={{ minWidth: 220 }}>
                            <div className="qr-wrapper text-center p-4 border border-dashed rounded-3 bg-white">
                                <div className="fw-bolder text-gray-700 fs-7 mb-3">
                                    <i className="bi bi-qr-code me-1 text-primary" />QR Code Equipment
                                </div>
                                <img
                                    src={`data:image/svg+xml;base64,${qrCode}`}
                                    alt={`QR Code ${equipment.equipment_code}`}
                                    className="mb-3"
                                    style={{ maxWidth: 180 }}
                                />
                                <div className="text-muted fs-9 mb-3">
                                    Scan untuk langsung membuat<br />maintenance record
                                </div>
                                <div className="d-grid gap-2">
                                    <button type="button" className="btn btn-sm btn-light-primary" onClick={handleDownloadQr}>
                                        <i className="bi bi-download me-1" />Unduh QR (PNG)
                                    </button>
                                    <button type="button" className="btn btn-sm btn-light" onClick={() => setShowPrintModal(true)}>
                                        <i className="bi bi-printer me-1" />Cetak QR
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Tab nav — state React, bukan Bootstrap data-bs-toggle ── */}
                    <ul className="nav nav-stretch nav-line-tabs nav-line-tabs-2x border-transparent fs-5 fw-bolder mt-4">
                        {TABS.map((tab) => (
                            <li className="nav-item" key={tab.key}>
                                <button
                                    type="button"
                                    className={`nav-link btn btn-link text-decoration-none pb-4 ${activeTab === tab.key ? 'active text-primary' : 'text-gray-600'}`}
                                    onClick={() => setActiveTab(tab.key)}
                                >
                                    <i className={`bi ${tab.icon} me-1`} />{tab.label}
                                    {tab.key === 'schedule' && (
                                        <span className="badge badge-light-primary ms-2">{schedules.length}</span>
                                    )}
                                    {tab.key === 'history' && (
                                        <span className="badge badge-light-secondary ms-2">{historyPagination.total}</span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* ═══ TAB: INFORMASI ═══ */}
            {activeTab === 'info' && (
                <div className="row g-5">
                    <div className="col-xl-6">
                        <div className="card shadow-lg h-100">
                            <div className="card-header border-0 pt-5">
                                <h4 className="card-title fw-bolder text-gray-800">
                                    <i className="bi bi-list-check text-primary me-2" />Spesifikasi Teknis
                                </h4>
                                <div className="card-toolbar">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-light-warning"
                                        onClick={() => navigate(`/admin/equipment/${id}/edit`)}
                                    >
                                        <i className="bi bi-pencil me-1" />Edit
                                    </button>
                                </div>
                            </div>
                            <div className="card-body pt-2">
                                {Object.keys(specifications).length > 0 ? (
                                    Object.entries(specifications).map(([key, val]) => (
                                        <div className="spec-item" key={key} style={{ borderLeft: '3px solid #009EF7', paddingLeft: 12, marginBottom: 12 }}>
                                            <div className="text-muted fs-8 fw-bold text-uppercase">{key}</div>
                                            <div className="fw-bolder text-gray-800">{val || '-'}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-muted py-8">
                                        <i className="bi bi-file-earmark-text fs-2x mb-3 d-block" />
                                        Spesifikasi belum diisi
                                        <div className="mt-3">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-light-primary"
                                                onClick={() => navigate(`/admin/equipment/${id}/edit`)}
                                            >
                                                <i className="bi bi-plus-circle me-1" />Tambah Spesifikasi
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-6">
                        <div className="card shadow-lg h-100">
                            <div className="card-header border-0 pt-5">
                                <h4 className="card-title fw-bolder text-gray-800">
                                    <i className="bi bi-card-list text-primary me-2" />Data Equipment
                                </h4>
                            </div>
                            <div className="card-body pt-2">
                                <table className="table table-row-dashed gy-3">
                                    <tbody>
                                        {[
                                            ['Kode Equipment', equipment.equipment_code],
                                            ['Nama Equipment', equipment.equipment_name],
                                            ['PM Number', equipment.pm_number],
                                            ['TIS Number', equipment.tis_number || '-'],
                                            ['ETM Group', equipment.etm_group],
                                            ['Lokasi', equipment.location || '-'],
                                        ].map(([label, val]) => (
                                            <tr key={label}>
                                                <td className="text-muted fw-bold w-150px">{label}</td>
                                                <td className="fw-bolder">{val}</td>
                                            </tr>
                                        ))}
                                        <tr>
                                            <td className="text-muted fw-bold">Status Unit</td>
                                            <td>
                                                <span className={`badge ${STATUS_BADGE[equipment.status] || 'badge-light'} fw-bold text-uppercase`}>
                                                    {equipment.status}
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ TAB: JADWAL PM ═══ */}
            {activeTab === 'schedule' && (
                <div className="card shadow-lg">
                    <div className="card-header border-0 pt-5">
                        <h4 className="card-title fw-bolder text-gray-800">
                            <i className="bi bi-calendar-event text-primary me-2" />Jadwal PM
                        </h4>
                    </div>
                    <div className="card-body pt-0">
                        <div className="table-responsive">
                            <table className="table table-row-bordered gy-4 gs-7">
                                <thead>
                                    <tr className="text-gray-600 fw-bolder fs-7 text-uppercase">
                                        <th className="text-center">No</th>
                                        <th>PM Cycle</th>
                                        <th className="text-center">PM Terakhir</th>
                                        <th className="text-center">Jadwal Berikutnya</th>
                                        <th className="text-center">Status</th>
                                        <th className="text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="fw-bold text-gray-600">
                                    {schedules.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center text-muted py-8">Belum ada jadwal PM</td>
                                        </tr>
                                    ) : schedules.map((sch, i) => (
                                        <tr key={sch.id}>
                                            <td className="text-center">{i + 1}</td>
                                            <td>
                                                <span className={`badge fw-bold fs-7 ${
                                                    sch.pm_cycle === '6M' ? 'badge-light-primary'
                                                        : sch.pm_cycle === '1Y' ? 'badge-light-success'
                                                            : 'badge-light-warning'
                                                }`}
                                                >
                                                    {sch.pm_cycle}
                                                </span>
                                            </td>
                                            <td className="text-center text-muted">
                                                {sch.last_maintenance ? formatDate(sch.last_maintenance) : 'Belum ada'}
                                            </td>
                                            <td className={`text-center fw-bolder ${
                                                sch.status === 'overdue' ? 'text-danger'
                                                    : sch.status === 'due' ? 'text-warning' : 'text-gray-800'
                                            }`}
                                            >
                                                {formatDate(sch.next_maintenance)}
                                                {sch.status === 'overdue' && (
                                                    <div className="text-danger fs-8 fw-bold">
                                                        ({diffForHumans(sch.next_maintenance)})
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                <span className={`badge fw-bold px-3 ${SCHEDULE_BADGE[sch.status] || 'badge-light-secondary'} ${sch.status === 'overdue' ? 'badge-pulse' : ''}`}>
                                                    {sch.status === 'overdue' ? 'Overdue'
                                                        : sch.status === 'due' ? 'Due'
                                                            : sch.status === 'completed' ? 'Selesai' : 'Pending'}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                {['due', 'overdue'].includes(sch.status) ? (
                                                    // NOTE: modul records diasumsikan masih Blade -> full navigate
                                                    <a href={`/admin/records/create?schedule_id=${sch.id}`} className="btn btn-sm btn-primary py-1 px-3">
                                                        <i className="bi bi-play-circle me-1" />Mulai PM
                                                    </a>
                                                ) : (
                                                    <span className="text-muted fs-8">Belum waktunya</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ TAB: RIWAYAT MAINTENANCE ═══ */}
            {activeTab === 'history' && (
                <div className="card shadow-lg">
                    <div className="card-header border-0 pt-5">
                        <h4 className="card-title fw-bolder text-gray-800">
                            <i className="bi bi-clock-history text-primary me-2" />Riwayat Maintenance
                        </h4>
                    </div>
                    <div className="card-body pt-3 pb-3 border-bottom">
                        <div className="row g-3 align-items-end">
                            <div className="col-lg-3">
                                <label className="form-label fw-bold fs-7 mb-1">Tahun</label>
                                <select
                                    className="form-select form-select-solid"
                                    value={historyFilters.filter_year}
                                    onChange={(e) => handleFilterChange({ filter_year: e.target.value })}
                                >
                                    <option value="">Semua Tahun</option>
                                    {history.available_years.map((yr) => (
                                        <option key={yr} value={yr}>{yr}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-lg-3">
                                <label className="form-label fw-bold fs-7 mb-1">Status</label>
                                <select
                                    className="form-select form-select-solid"
                                    value={historyFilters.filter_status}
                                    onChange={(e) => handleFilterChange({ filter_status: e.target.value })}
                                >
                                    <option value="all">Semua Status</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="validated">Validated</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                            <div className="col-lg-2">
                                <button type="button" className="btn btn-sm btn-light-primary w-100" onClick={handleResetFilters}>
                                    <i className="bi bi-arrow-clockwise me-1" />Reset
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="card-body pt-0">
                        <div className="table-responsive">
                            <table className="table table-row-bordered gy-4 gs-7">
                                <thead>
                                    <tr className="text-gray-600 fw-bolder fs-7 text-uppercase">
                                        <th className="text-center">No</th>
                                        <th>No Record</th>
                                        <th className="text-center">Tanggal</th>
                                        <th className="text-center">Waktu</th>
                                        <th>PM Cycle</th>
                                        <th>Teknisi</th>
                                        <th>Checker</th>
                                        <th className="text-center">Status</th>
                                        <th className="text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="fw-bold text-gray-600">
                                    {historyRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="text-center text-muted py-8">
                                                <i className="bi bi-clock-history fs-2x mb-3 d-block" />
                                                Belum ada riwayat maintenance
                                            </td>
                                        </tr>
                                    ) : historyRows.map((rec, i) => {
                                        const [color, text] = RECORD_STATUS_MAP[rec.status] || ['secondary', rec.status];
                                        return (
                                            <tr
                                                key={rec.id}
                                                className="history-row"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => { window.location.href = `/admin/records/${rec.id}`; }}
                                            >
                                                <td className="text-center">{historyPagination.from + i}</td>
                                                <td className="fw-bolder text-primary">{rec.record_number}</td>
                                                <td className="text-center">{formatDate(rec.maintenance_date)}</td>
                                                <td className="text-center text-muted">
                                                    {rec.start_time?.slice(0, 5)}
                                                    {rec.end_time && ` – ${rec.end_time.slice(0, 5)}`}
                                                </td>
                                                <td>
                                                    {rec.pm_cycle ? (
                                                        <span className={`badge fw-bold ${
                                                            rec.pm_cycle === '6M' ? 'badge-light-primary'
                                                                : rec.pm_cycle === '1Y' ? 'badge-light-success' : 'badge-light-warning'
                                                        }`}
                                                        >
                                                            {rec.pm_cycle}
                                                        </span>
                                                    ) : <span className="text-muted">-</span>}
                                                </td>
                                                <td>
                                                    <span className="d-flex align-items-center gap-2">
                                                        <span className="symbol symbol-25px">
                                                            <span className="symbol-label bg-light-primary fs-9 fw-bolder">
                                                                {rec.technician_name?.slice(0, 2).toUpperCase()}
                                                            </span>
                                                        </span>
                                                        {rec.technician_name}
                                                    </span>
                                                </td>
                                                <td>{rec.checker_name || '-'}</td>
                                                <td className="text-center">
                                                    <span className={`badge badge-${color} fw-bold px-3`}>{text}</span>
                                                </td>
                                                <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                                    <a href={`/admin/records/${rec.id}`} className="btn btn-sm btn-icon btn-light-primary">
                                                        <i className="bi bi-eye" />
                                                    </a>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {historyPagination.last_page > 1 && (
                            <div className="d-flex justify-content-between align-items-center mt-4">
                                <div className="text-muted fs-7">
                                    {historyPagination.from}–{historyPagination.to} dari {historyPagination.total} record
                                </div>
                                <div className="d-flex gap-2">
                                    {Array.from({ length: historyPagination.last_page }, (_, i) => i + 1).map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => goToHistoryPage(p)}
                                            className={`btn btn-sm ${p === historyPagination.current_page ? 'btn-primary' : 'btn-light'}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ TAB: STATISTIK ═══ */}
            {activeTab === 'chart' && (
                <div className="row g-5">
                    <div className="col-xl-8">
                        <div className="card shadow-lg h-100">
                            <div className="card-header border-0 pt-5">
                                <h4 className="card-title fw-bolder">PM Record per Tahun</h4>
                            </div>
                            <div className="card-body pt-2" style={{ height: 320 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="year" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="total" name="Total PM" fill="rgba(0,158,247,0.85)" radius={[5, 5, 0, 0]} />
                                        <Bar dataKey="validated" name="Validated" fill="rgba(80,205,137,0.9)" radius={[5, 5, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-4">
                        <div className="card shadow-lg h-100">
                            <div className="card-header border-0 pt-5">
                                <h4 className="card-title fw-bolder">Timeline Jadwal</h4>
                            </div>
                            <div className="card-body pt-2">
                                {schedules.length === 0 ? (
                                    <div className="text-center text-muted py-8">Belum ada jadwal</div>
                                ) : schedules.map((sch, i) => (
                                    <div
                                        className="position-relative ps-7 pb-5"
                                        key={sch.id}
                                        style={i < schedules.length - 1 ? { borderLeft: '2px solid var(--bs-border-color)', marginLeft: 8 } : {}}
                                    >
                                        <div
                                            className={`position-absolute rounded-circle ${SCHEDULE_BADGE[sch.status]?.replace('badge-', 'bg-') || 'bg-secondary'}`}
                                            style={{ width: 14, height: 14, left: -8, top: 4 }}
                                        />
                                        <div className="fw-bolder text-gray-800 fs-7">PM {sch.pm_cycle}</div>
                                        <div className="text-muted fs-8">{formatDate(sch.next_maintenance)}</div>
                                        <span className={`badge fw-bold mt-1 ${SCHEDULE_BADGE[sch.status] || 'badge-light-secondary'}`} style={{ fontSize: 10 }}>
                                            {sch.status.toUpperCase()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ MODAL PRINT QR ═══ */}
            {showPrintModal && (
                <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered mw-400px">
                        <div className="modal-content">
                            <div className="modal-header border-0 pb-0">
                                <h5 className="modal-title fw-bolder">Cetak QR Code</h5>
                                <button type="button" className="btn-close" onClick={() => setShowPrintModal(false)} />
                            </div>
                            <div className="modal-body text-center py-6">
                                <div className="fw-bolder fs-5 text-gray-800 mb-1">{equipment.equipment_name}</div>
                                <div className="text-muted fs-7 mb-4">{equipment.equipment_code} · {equipment.etm_group}</div>
                                <img src={`data:image/svg+xml;base64,${qrCode}`} alt="QR Code" style={{ width: 200 }} />
                                <div className="text-muted fs-8 mt-3">Scan untuk membuat Maintenance Record</div>
                            </div>
                            <div className="modal-footer border-0 pt-0">
                                <button type="button" className="btn btn-primary w-100" onClick={() => window.print()}>
                                    <i className="bi bi-printer me-1" />Cetak
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function statusTone(status) {
    if (status === 'active') return 'success';
    if (status === 'maintenance') return 'warning';
    return 'danger';
}

function MiniStat({ value, label, color, isText }) {
    return (
        <div className="border border-dashed rounded px-4 py-3">
            <div className={`fw-bolder fs-3 ${color}`}>{value}</div>
            <div className="text-muted fs-8 fw-bold">{label}</div>
        </div>
    );
}