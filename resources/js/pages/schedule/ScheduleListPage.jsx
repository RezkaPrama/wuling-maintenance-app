import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
    fetchSchedules,
    recalculateScheduleStatus,
    setListFilters,
} from '../../features/schedule/scheduleSlice';
import PageToolbar from '../../components/PageToolbar';

const STATUS_MAP = {
    pending: { badge: 'badge-light-info', label: 'Pending' },
    due: { badge: 'badge-light-warning', label: 'Due' },
    overdue: { badge: 'badge-light-danger', label: 'Overdue' },
    completed: { badge: 'badge-light-success', label: 'Completed' },
};

const CAL_EVENT_STYLE = {
    pending: { background: '#e8f4fd', color: '#0095e8' },
    due: { background: '#fff4de', color: '#f6a723' },
    overdue: { background: '#ffeef3', color: '#d9214e' },
    completed: { background: '#e8fff3', color: '#50cd89' },
};

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function shiftMonth(yyyyMm, delta) {
    const [y, m] = yyyyMm.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function ScheduleListPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { items, pagination, calendar, stats, scheduleThisMonth, etmGroups, filters, status, error } =
        useSelector((s) => s.schedule.list);
    const recalcStatus = useSelector((s) => s.schedule.recalculate.status);

    useEffect(() => {
        dispatch(fetchSchedules({ ...filters, page: 1 }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.filter_status, filters.filter_cycle, filters.filter_group, filters.filter_month]);

    const goToPage = (page) => dispatch(fetchSchedules({ ...filters, page }));

    const changeMonth = (delta) => {
        dispatch(setListFilters({ filter_month: shiftMonth(filters.filter_month, delta) }));
    };

    const handleResetFilters = () => {
        dispatch(setListFilters({ filter_status: '', filter_cycle: '', filter_group: '' }));
    };

    const handleRecalculate = async () => {
        if (!window.confirm('Sistem akan menghitung ulang status semua jadwal PM berdasarkan tanggal hari ini. Lanjutkan?')) return;
        const result = await dispatch(recalculateScheduleStatus());
        if (recalculateScheduleStatus.fulfilled.match(result)) {
            alert(result.payload.message);
            dispatch(fetchSchedules({ ...filters, page: pagination?.current_page || 1 }));
        } else {
            alert(result.payload || 'Gagal sync status.');
        }
    };

    // ── Bangun grid kalender dari calendar.events (flat list) ──
    const calendarGrid = useMemo(() => {
        if (!calendar.year || !calendar.month) return null;

        const eventsByDay = {};
        calendar.events.forEach((ev) => {
            const day = Number(ev.next_maintenance.slice(8, 10));
            if (!eventsByDay[day]) eventsByDay[day] = [];
            eventsByDay[day].push(ev);
        });

        const daysInMonth = new Date(calendar.year, calendar.month, 0).getDate();
        const startDow = new Date(calendar.year, calendar.month - 1, 1).getDay();
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === calendar.year && today.getMonth() + 1 === calendar.month;

        const cells = [];
        for (let i = 0; i < startDow; i++) cells.push({ day: null });
        for (let d = 1; d <= daysInMonth; d++) {
            cells.push({ day: d, isToday: isCurrentMonth && d === today.getDate(), events: eventsByDay[d] || [] });
        }
        while (cells.length % 7 !== 0) cells.push({ day: null });

        const weeks = [];
        for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
        return weeks;
    }, [calendar]);

    return (
        <>
            <PageToolbar title="Jadwal Preventive Maintenance" menuUtama="Menu Utama" menuItem="Schedule PM" />

            <div className="d-flex align-items-center justify-content-between mb-6 flex-wrap gap-3">
                <div>
                    <h1 className="fs-2 fw-bold text-gray-900 mb-1">Jadwal Preventive Maintenance</h1>
                    <span className="text-muted fs-6">Kelola dan pantau jadwal PM seluruh equipment</span>
                </div>
                <div className="d-flex gap-2 align-items-center flex-wrap">
                    <button type="button" className="btn btn-sm btn-light-primary" onClick={() => changeMonth(-1)} title="Bulan Sebelumnya">
                        <i className="bi bi-chevron-left" />
                    </button>
                    <span className="btn btn-sm btn-primary pe-none fw-bold">
                        {MONTH_NAMES[Number(filters.filter_month.slice(5, 7)) - 1]} {filters.filter_month.slice(0, 4)}
                    </span>
                    <button type="button" className="btn btn-sm btn-light-primary" onClick={() => changeMonth(1)} title="Bulan Berikutnya">
                        <i className="bi bi-chevron-right" />
                    </button>

                    <div className="mx-1" style={{ height: 28, width: 1, background: 'var(--bs-gray-300)' }} />

                    <button
                        type="button"
                        className="btn btn-sm btn-light-warning"
                        onClick={handleRecalculate}
                        disabled={recalcStatus === 'loading'}
                        title="Update status semua jadwal berdasarkan tanggal hari ini"
                    >
                        {recalcStatus === 'loading' ? (
                            <><span className="spinner-border spinner-border-sm me-1" />Syncing...</>
                        ) : (
                            <><i className="bi bi-arrow-clockwise me-1" />Sync Status</>
                        )}
                    </button>

                    <button type="button" className="btn btn-sm btn-primary" onClick={() => navigate('/admin/schedules/create')}>
                        <i className="bi bi-plus-circle me-1" />Tambah Jadwal PM
                    </button>
                </div>
            </div>

            {/* ── STAT CARDS ── */}
            <div className="row g-4 mb-6">
                {[
                    { label: 'Total Jadwal', value: stats.total, icon: 'bi-calendar3', color: 'primary' },
                    { label: 'Bulan Ini', value: scheduleThisMonth, icon: 'bi-calendar-check', color: 'info' },
                    { label: 'Due', value: stats.due, icon: 'bi-exclamation-circle', color: 'warning' },
                    { label: 'Overdue', value: stats.overdue, icon: 'bi-x-circle', color: 'danger' },
                    { label: 'Completed', value: stats.completed, icon: 'bi-check-circle', color: 'success' },
                ].map((c) => (
                    <div className="col-6 col-lg" key={c.label}>
                        <div className="card card-flush h-100 border-0 shadow-sm">
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

            {/* ── DEBUG SEMENTARA — hapus setelah kalender fix ── */}
            <div className="alert alert-secondary p-3 mb-4" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                <div className="fw-bold mb-1">🔧 DEBUG (hapus nanti):</div>
                <div>status: {JSON.stringify(status)}</div>
                <div className="text-danger fw-bold">error: {JSON.stringify(error)}</div>
                <div>filters.filter_month: {JSON.stringify(filters.filter_month)}</div>
                <div>calendar.year: {JSON.stringify(calendar.year)}, calendar.month: {JSON.stringify(calendar.month)}</div>
                <div>calendar.events.length: {calendar.events?.length ?? 'undefined'}</div>
                <div>items.length: {items.length}</div>
            </div>

            {/* ── KALENDER ── */}
            <div className="card card-flush border-0 shadow-sm mb-6">
                <div className="card-header border-0 pt-6">
                    <div className="card-title">
                        <h3 className="fw-bold fs-4 mb-0">
                            <i className="bi bi-calendar3 me-2 text-primary" />
                            Kalender PM — {MONTH_NAMES[Number(filters.filter_month.slice(5, 7)) - 1]} {filters.filter_month.slice(0, 4)}
                        </h3>
                    </div>
                    <div className="card-toolbar gap-2 d-flex flex-wrap">
                        {Object.entries(STATUS_MAP).map(([key, val]) => (
                            <span key={key} className={`badge ${val.badge}`}>
                                <i className="bi bi-circle-fill me-1" style={{ fontSize: 8 }} />{val.label}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="card-body pt-0 px-6 pb-6">
                    {!calendarGrid && (
                        <div className="alert alert-warning d-flex align-items-start p-4">
                            <i className="bi bi-exclamation-triangle fs-2 me-3" />
                            <div>
                                <div className="fw-bold mb-1">Kalender belum bisa ditampilkan</div>
                                <div className="fs-8">
                                    Data <code>calendar.year</code>/<code>calendar.month</code> dari API kosong atau tidak sesuai format.
                                    <br />Nilai yang diterima sekarang: <code>{JSON.stringify(calendar)}</code>
                                    <br />Cek apakah backend mengirim <code>calendar.year</code> &amp; <code>calendar.month</code> sebagai angka (bukan string kosong/null).
                                </div>
                            </div>
                        </div>
                    )}
                    {calendarGrid && (
                        <table style={{ borderCollapse: 'separate', borderSpacing: 4, width: '100%' }}>
                            <thead>
                                <tr>
                                    {DAY_NAMES.map((d) => (
                                        <th
                                            key={d}
                                            style={{
                                                background: '#f5f8fa', fontSize: '0.75rem', fontWeight: 600,
                                                textTransform: 'uppercase', letterSpacing: '.05em', color: '#7e8299',
                                                padding: '6px 4px', textAlign: 'center', borderRadius: 4,
                                            }}
                                        >
                                            {d}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {calendarGrid.map((week, wi) => (
                                    <tr key={wi}>
                                        {week.map((cell, ci) => (
                                            <td
                                                key={ci}
                                                style={{
                                                    verticalAlign: 'top', minHeight: 90, height: 90, width: '14.28%',
                                                    padding: 4,
                                                    background: cell.day === null ? '#fafafa' : cell.isToday ? '#f0f3ff' : '#fff',
                                                    border: cell.isToday ? '1px solid #6366f1' : '1px solid #eff2f5',
                                                    borderRadius: 6, position: 'relative',
                                                    opacity: cell.day === null ? 0.6 : 1,
                                                }}
                                            >
                                                {cell.day !== null && (
                                                    <>
                                                        <span
                                                            style={{
                                                                fontSize: '0.75rem', fontWeight: 600,
                                                                color: cell.isToday ? '#6366f1' : '#5e6278',
                                                                position: 'absolute', top: 4, right: 6,
                                                            }}
                                                        >
                                                            {cell.day}
                                                        </span>
                                                        <div style={{ marginTop: 18 }}>
                                                            {cell.events.map((ev) => (
                                                                <Link
                                                                    key={ev.id}
                                                                    to={`/admin/schedules/${ev.id}`}
                                                                    title={`${ev.equipment_name} (${ev.pm_cycle})`}
                                                                    style={{
                                                                        ...CAL_EVENT_STYLE[ev.status],
                                                                        fontSize: '0.68rem', borderRadius: 3, padding: '1px 4px',
                                                                        marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden',
                                                                        textOverflow: 'ellipsis', display: 'block', textDecoration: 'none',
                                                                    }}
                                                                >
                                                                    {ev.equipment_code.length > 12 ? `${ev.equipment_code.slice(0, 12)}…` : ev.equipment_code}
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ── FILTER + TABEL LIST ── */}
            <div className="card card-flush border-0 shadow-sm">
                <div className="card-header border-0 pt-6 flex-wrap gap-3">
                    <div className="card-title">
                        <h3 className="fw-bold fs-4 mb-0">
                            <i className="bi bi-list-check me-2 text-primary" />Daftar Jadwal PM
                        </h3>
                    </div>
                    <div className="card-toolbar">
                        <div className="d-flex flex-wrap gap-2 align-items-center">
                            <select
                                className="form-select form-select-sm w-auto"
                                value={filters.filter_status}
                                onChange={(e) => dispatch(setListFilters({ filter_status: e.target.value }))}
                            >
                                <option value="">Semua Status</option>
                                <option value="pending">Pending</option>
                                <option value="due">Due</option>
                                <option value="overdue">Overdue</option>
                                <option value="completed">Completed</option>
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
                            <select
                                className="form-select form-select-sm w-auto"
                                value={filters.filter_group}
                                onChange={(e) => dispatch(setListFilters({ filter_group: e.target.value }))}
                            >
                                <option value="">Semua Group</option>
                                {etmGroups.map((g) => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                            {(filters.filter_status || filters.filter_cycle || filters.filter_group) && (
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
                                <div className="fw-bold">Gagal memuat data jadwal PM</div>
                                <div className="fs-7">{error}</div>
                            </div>
                        </div>
                    )}

                    {status === 'loading' && (
                        <div className="text-center py-10 text-muted">Memuat data...</div>
                    )}

                    {status === 'succeeded' && items.length === 0 && (
                        <div className="text-center py-10">
                            <i className="bi bi-calendar-x fs-1 text-muted mb-3 d-block" />
                            <p className="text-muted">Tidak ada jadwal yang ditemukan.</p>
                        </div>
                    )}

                    {items.length > 0 && (
                        <>
                            <div className="table-responsive">
                                <table className="table table-row-dashed table-row-gray-200 align-middle gs-0 gy-3">
                                    <thead>
                                        <tr className="fw-bold text-muted fs-7 text-uppercase">
                                            <th className="ps-4">Equipment</th>
                                            <th>PM Cycle</th>
                                            <th>Last PM</th>
                                            <th>Next PM</th>
                                            <th>Status</th>
                                            <th className="text-end pe-4">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((s) => {
                                            const daysLeft = Math.round((new Date(s.next_maintenance) - new Date().setHours(0, 0, 0, 0)) / 86400000);
                                            const isLate = daysLeft < 0;
                                            const st = STATUS_MAP[s.status] || { badge: 'badge-light', label: s.status };
                                            return (
                                                <tr key={s.id}>
                                                    <td className="ps-4">
                                                        <div className="d-flex align-items-center gap-3">
                                                            <div className="symbol symbol-35px">
                                                                <div className={`symbol-label ${s.equipment_status === 'active' ? 'bg-light-success' : 'bg-light-warning'}`}>
                                                                    <i className={`bi bi-cpu fs-5 ${s.equipment_status === 'active' ? 'text-success' : 'text-warning'}`} />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <Link to={`/admin/equipment/${s.equipment_id}`} className="fw-bold text-gray-800 text-hover-primary d-block">
                                                                    {s.equipment_name}
                                                                </Link>
                                                                <span className="text-muted fs-8">
                                                                    {s.equipment_code}{s.etm_group ? ` · ${s.etm_group}` : ''}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-light-primary fw-semibold">{s.pm_cycle}</span>
                                                    </td>
                                                    <td className="text-muted fs-7">
                                                        {s.last_maintenance ? new Date(s.last_maintenance).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                    </td>
                                                    <td>
                                                        <div className={`fw-semibold ${isLate ? 'text-danger' : 'text-gray-800'}`}>
                                                            {new Date(s.next_maintenance).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </div>
                                                        <div className={`fs-8 ${isLate ? 'text-danger' : 'text-muted'}`}>
                                                            {isLate ? (
                                                                <><i className="bi bi-exclamation-triangle-fill me-1" />{Math.abs(daysLeft)} hari terlambat</>
                                                            ) : daysLeft === 0 ? (
                                                                <><i className="bi bi-clock-fill me-1 text-warning" />Hari ini</>
                                                            ) : (
                                                                `${daysLeft} hari lagi`
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${st.badge} fw-semibold px-3 py-2`}>{st.label}</span>
                                                    </td>
                                                    <td className="text-end pe-4">
                                                        <div className="d-flex justify-content-end gap-2">
                                                            <Link to={`/admin/schedules/${s.id}`} className="btn btn-sm btn-light-primary">
                                                                <i className="bi bi-eye me-1" />Detail
                                                            </Link>
                                                            <Link to={`/admin/schedules/${s.id}/edit`} className="btn btn-sm btn-light-secondary btn-icon" title="Edit Jadwal">
                                                                <i className="bi bi-pencil" />
                                                            </Link>
                                                            {['due', 'overdue'].includes(s.status) && (
                                                                <a href={`/admin/records/create?schedule_id=${s.id}`} className="btn btn-sm btn-danger">
                                                                    <i className="bi bi-play-fill me-1" />Mulai PM
                                                                </a>
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
                                        Menampilkan {pagination.from}–{pagination.to} dari {pagination.total} jadwal
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