import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchDashboardSummary,
    selectDashboardSummary,
    selectDashboardLoading,
    selectDashboardError,
    selectDashboardLastFetched,
} from '../store/slices/dashboardSlice';
import { selectCurrentUser } from '../store/slices/authSlice';
import StatCard from '../components/dashboard/StatCard';

// ── Konfigurasi stat cards sesuai response API ──────────────────────────────
const STAT_CONFIG = [
    {
        key:         'overdue',
        title:       'Terlambat',
        icon:        'bi-exclamation-circle-fill',
        colorClass:  'danger',
        description: 'Maintenance melewati jadwal',
    },
    {
        key:         'due_today',
        title:       'Jatuh Tempo Hari Ini',
        icon:        'bi-calendar-check-fill',
        colorClass:  'warning',
        description: 'Harus diselesaikan hari ini',
    },
    {
        key:         'due_this_week',
        title:       'Jatuh Tempo Minggu Ini',
        icon:        'bi-calendar-week-fill',
        colorClass:  'info',
        description: 'Jadwal dalam 7 hari ke depan',
    },
    {
        key:         'in_progress',
        title:       'Sedang Dikerjakan',
        icon:        'bi-arrow-repeat',
        colorClass:  'primary',
        description: 'Maintenance sedang berlangsung',
    },
    {
        key:         'completed_today',
        title:       'Selesai Hari Ini',
        icon:        'bi-check-circle-fill',
        colorClass:  'success',
        description: 'Berhasil diselesaikan hari ini',
    },
];

// ── Helper format waktu ──────────────────────────────────────────────────────
const formatLastFetched = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString('id-ID', {
        hour:   '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

const getTodayLabel = () => new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
});

// ── Mini bar chart dari data summary ────────────────────────────────────────
const SummaryChart = ({ summary, loading }) => {
    const bars = STAT_CONFIG.map((cfg) => ({
        label:      cfg.title,
        value:      summary[cfg.key] || 0,
        colorClass: cfg.colorClass,
    }));

    const maxValue = Math.max(...bars.map((b) => b.value), 1);

    if (loading) {
        return (
            <div className="card h-100">
                <div className="card-body p-7 placeholder-glow">
                    <span className="placeholder col-5 rounded mb-6 d-block" style={{ height: '24px' }} />
                    {[1,2,3,4,5].map((i) => (
                        <div key={i} className="d-flex align-items-center mb-4 gap-3">
                            <span className="placeholder rounded" style={{ width: '120px', height: '14px' }} />
                            <span className="placeholder rounded flex-grow-1" style={{ height: '24px' }} />
                            <span className="placeholder rounded" style={{ width: '30px', height: '14px' }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const colorMap = {
        danger:  '#f1416c',
        warning: '#ffc700',
        info:    '#7239ea',
        primary: '#009ef7',
        success: '#50cd89',
    };

    return (
        <div className="card h-100 border-0 shadow-sm">
            <div className="card-header border-0 pt-6 pb-0">
                <h3 className="card-title fw-bold text-dark fs-4">
                    Ringkasan Status
                </h3>
                <div className="card-toolbar">
                    <span className="badge badge-light-primary fw-semibold">
                        {getTodayLabel()}
                    </span>
                </div>
            </div>
            <div className="card-body pt-5 pb-7 px-7">
                {bars.map((bar) => (
                    <div key={bar.label} className="mb-5">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fs-7 fw-semibold text-gray-700">{bar.label}</span>
                            <span
                                className="fs-6 fw-bold"
                                style={{ color: colorMap[bar.colorClass] }}
                            >
                                {bar.value}
                            </span>
                        </div>
                        <div
                            className="rounded"
                            style={{ height: '10px', backgroundColor: '#f1f3f8', overflow: 'hidden' }}
                        >
                            <div
                                className="rounded h-100"
                                style={{
                                    width:           `${(bar.value / maxValue) * 100}%`,
                                    backgroundColor: colorMap[bar.colorClass],
                                    transition:      'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                                    minWidth:        bar.value > 0 ? '4px' : '0',
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Main Dashboard Page ──────────────────────────────────────────────────────
const DashboardPage = () => {
    const dispatch    = useDispatch();
    const summary     = useSelector(selectDashboardSummary);
    const loading     = useSelector(selectDashboardLoading);
    const error       = useSelector(selectDashboardError);
    const lastFetched = useSelector(selectDashboardLastFetched);
    const user        = useSelector(selectCurrentUser);

    // Fetch data saat mount
    useEffect(() => {
        dispatch(fetchDashboardSummary());
    }, [dispatch]);

    // Auto-refresh setiap 5 menit
    useEffect(() => {
        const interval = setInterval(() => {
            dispatch(fetchDashboardSummary());
        }, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [dispatch]);

    const totalScheduled = Object.values(summary).reduce((a, b) => a + b, 0);

    return (
        <>
            {/* ── Toolbar ── */}
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-dark fw-bold fs-3 flex-column justify-content-center my-0">
                            Dashboard
                        </h1>
                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">Home</li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-400 w-5px h-2px" />
                            </li>
                            <li className="breadcrumb-item text-muted">Dashboard</li>
                        </ul>
                    </div>

                    {/* Refresh button */}
                    <div className="d-flex align-items-center gap-2 gap-lg-3">
                        {lastFetched && (
                            <span className="text-muted fs-7 me-2">
                                Update: {formatLastFetched(lastFetched)}
                            </span>
                        )}
                        <button
                            className="btn btn-sm btn-light-primary fw-semibold"
                            onClick={() => dispatch(fetchDashboardSummary())}
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="spinner-border spinner-border-sm me-2" />
                            ) : (
                                <i className="bi bi-arrow-clockwise me-2" />
                            )}
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Content ── */}
            <div id="kt_app_content" className="app-content flex-column-fluid">
                <div id="kt_app_content_container" className="app-container container-xxl">

                    {/* Greeting */}
                    <div className="card mb-6 border-0 shadow-sm"
                         style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #009ef7 100%)' }}>
                        <div className="card-body px-8 py-7">
                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                                <div>
                                    <h2 className="text-white fw-bold fs-2 mb-1">
                                        Selamat datang, {user?.name || 'Administrator'} 👋
                                    </h2>
                                    <div className="text-white opacity-75 fs-6">
                                        {getTodayLabel()} — Total {totalScheduled} item maintenance terpantau
                                    </div>
                                </div>
                                <div className="text-end">
                                    <div className="text-white opacity-50 fs-8 mb-1">Departemen</div>
                                    <span className="badge badge-light fs-7 fw-bold">
                                        {user?.department || '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Error State */}
                    {error && (
                        <div className="alert alert-danger d-flex align-items-center p-5 mb-6">
                            <i className="bi bi-exclamation-triangle-fill fs-2 text-danger me-4" />
                            <div>
                                <h5 className="mb-1 text-danger">Gagal memuat data</h5>
                                <span>{error}</span>
                            </div>
                            <button
                                className="btn btn-sm btn-light-danger ms-auto"
                                onClick={() => dispatch(fetchDashboardSummary())}
                            >
                                Coba Lagi
                            </button>
                        </div>
                    )}

                    {/* ── Stat Cards ── */}
                    <div className="row g-5 mb-6">
                        {STAT_CONFIG.map((cfg) => (
                            <StatCard
                                key={cfg.key}
                                title={cfg.title}
                                value={summary[cfg.key] || 0}
                                icon={cfg.icon}
                                colorClass={cfg.colorClass}
                                description={cfg.description}
                                loading={loading && !lastFetched}
                            />
                        ))}
                    </div>

                    {/* ── Chart + Info ── */}
                    <div className="row g-5">
                        {/* Bar chart summary */}
                        <div className="col-xl-8">
                            <SummaryChart summary={summary} loading={loading && !lastFetched} />
                        </div>

                        {/* Status highlight */}
                        <div className="col-xl-4">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-header border-0 pt-6 pb-0">
                                    <h3 className="card-title fw-bold text-dark fs-4">
                                        Perhatian
                                    </h3>
                                </div>
                                <div className="card-body pt-4">

                                    {/* Overdue alert */}
                                    {summary.overdue > 0 ? (
                                        <div className="d-flex align-items-center bg-light-danger rounded p-4 mb-4">
                                            <i className="bi bi-exclamation-octagon-fill text-danger fs-2 me-4" />
                                            <div>
                                                <div className="fw-bold text-danger fs-5">
                                                    {summary.overdue} item terlambat!
                                                </div>
                                                <div className="text-muted fs-7">
                                                    Segera lakukan pengecekan
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="d-flex align-items-center bg-light-success rounded p-4 mb-4">
                                            <i className="bi bi-check-circle-fill text-success fs-2 me-4" />
                                            <div>
                                                <div className="fw-bold text-success fs-5">
                                                    Tidak ada keterlambatan
                                                </div>
                                                <div className="text-muted fs-7">
                                                    Semua jadwal on track
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Due today alert */}
                                    {summary.due_today > 0 && (
                                        <div className="d-flex align-items-center bg-light-warning rounded p-4 mb-4">
                                            <i className="bi bi-clock-fill text-warning fs-2 me-4" />
                                            <div>
                                                <div className="fw-bold text-warning fs-5">
                                                    {summary.due_today} jatuh tempo hari ini
                                                </div>
                                                <div className="text-muted fs-7">
                                                    Selesaikan sebelum akhir hari
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* In progress */}
                                    {summary.in_progress > 0 && (
                                        <div className="d-flex align-items-center bg-light-primary rounded p-4 mb-4">
                                            <i className="bi bi-gear-fill text-primary fs-2 me-4" />
                                            <div>
                                                <div className="fw-bold text-primary fs-5">
                                                    {summary.in_progress} sedang dikerjakan
                                                </div>
                                                <div className="text-muted fs-7">
                                                    Maintenance aktif berlangsung
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Completed today */}
                                    {summary.completed_today > 0 && (
                                        <div className="d-flex align-items-center bg-light-success rounded p-4">
                                            <i className="bi bi-trophy-fill text-success fs-2 me-4" />
                                            <div>
                                                <div className="fw-bold text-success fs-5">
                                                    {summary.completed_today} selesai hari ini
                                                </div>
                                                <div className="text-muted fs-7">
                                                    Kerja bagus! 🎉
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Kalau semua 0 */}
                                    {totalScheduled === 0 && !loading && (
                                        <div className="text-center py-6">
                                            <i className="bi bi-inbox fs-3x text-muted mb-3 d-block" />
                                            <div className="text-muted fs-6">
                                                Tidak ada data maintenance
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
};

export default DashboardPage;