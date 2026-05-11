@extends('layouts.app')

@section('subtitle')
    Dashboard Maintenance
@endsection

@section('styles')
<style>
    /* ── Stat card hover ── */
    .card-stat {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .card-stat:hover {
        transform: translateY(-3px);
        box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.12) !important;
    }

    /* ── Status badge row colors ── */
    .row-overdue { background-color: rgba(244,67,54,0.08) !important; }
    .row-due     { background-color: rgba(255,199,0,0.12) !important; }
    .row-pending { background-color: transparent; }

    /* ── Pulse animasi untuk overdue ── */
    @keyframes pulse-red {
        0%,100% { opacity: 1; }
        50%      { opacity: 0.5; }
    }
    .badge-overdue-pulse { animation: pulse-red 1.8s ease-in-out infinite; }

    /* ── PM Cycle donut center text ── */
    .donut-center {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -55%);
        text-align: center;
        pointer-events: none;
    }
</style>
@endsection

@section('content')
<div class="content d-flex flex-column flex-column-fluid" id="kt_content">

    @include('partials.toolbar')

    <div class="post d-flex flex-column-fluid" id="kt_post">
        <div id="kt_content_container" class="container-xxl">

            {{-- ═══════════════════════════════════════════════════════════
                 ROW 1 — STAT CARDS UTAMA
            ════════════════════════════════════════════════════════════ --}}
            <div class="row g-5 g-xl-8 mb-5">

                {{-- Equipment Aktif --}}
                <div class="col-xl-3 col-md-6">
                    <div class="card card-stat bg-body border-0 shadow-sm h-100">
                        <div class="card-body d-flex align-items-center p-6">
                            <div class="symbol symbol-50px me-5">
                                <span class="symbol-label bg-light-success">
                                    <i class="bi bi-cpu fs-2x text-success"></i>
                                </span>
                            </div>
                            <div class="flex-grow-1">
                                <div class="fw-bolder fs-2x text-gray-800"
                                     data-kt-countup="true"
                                     data-kt-countup-value="{{ $totalEquipment }}">0</div>
                                <div class="fw-bold fs-7 text-gray-400">Equipment Aktif</div>
                            </div>
                        </div>
                        <div class="card-footer p-3 bg-light-success rounded-bottom">
                            <span class="text-success fw-bold fs-8">
                                <i class="bi bi-check-circle me-1"></i>{{ $totalEquipmentInactive }} unit tidak aktif
                            </span>
                        </div>
                    </div>
                </div>

                {{-- Jadwal PM Bulan Ini --}}
                <div class="col-xl-3 col-md-6">
                    <div class="card card-stat bg-body border-0 shadow-sm h-100">
                        <div class="card-body d-flex align-items-center p-6">
                            <div class="symbol symbol-50px me-5">
                                <span class="symbol-label bg-light-primary">
                                    <i class="bi bi-calendar3 fs-2x text-primary"></i>
                                </span>
                            </div>
                            <div class="flex-grow-1">
                                <div class="fw-bolder fs-2x text-gray-800"
                                     data-kt-countup="true"
                                     data-kt-countup-value="{{ $schedulesThisMonth }}">0</div>
                                <div class="fw-bold fs-7 text-gray-400">Jadwal PM Bulan Ini</div>
                            </div>
                        </div>
                        <div class="card-footer p-3 bg-light-primary rounded-bottom">
                            <span class="text-primary fw-bold fs-8">
                                <i class="bi bi-check2-circle me-1"></i>{{ $recordsCompletedThisMonth }} selesai bulan ini
                            </span>
                        </div>
                    </div>
                </div>

                {{-- PM Due / Jatuh Tempo --}}
                <div class="col-xl-3 col-md-6">
                    <div class="card card-stat bg-body border-0 shadow-sm h-100">
                        <div class="card-body d-flex align-items-center p-6">
                            <div class="symbol symbol-50px me-5">
                                <span class="symbol-label bg-light-warning">
                                    <i class="bi bi-exclamation-triangle fs-2x text-warning"></i>
                                </span>
                            </div>
                            <div class="flex-grow-1">
                                <div class="fw-bolder fs-2x text-gray-800"
                                     data-kt-countup="true"
                                     data-kt-countup-value="{{ $schedulesDue }}">0</div>
                                <div class="fw-bold fs-7 text-gray-400">PM Jatuh Tempo</div>
                            </div>
                        </div>
                        <div class="card-footer p-3 bg-light-warning rounded-bottom">
                            <span class="text-warning fw-bold fs-8">
                                <i class="bi bi-alarm me-1"></i>Segera dikerjakan
                            </span>
                        </div>
                    </div>
                </div>

                {{-- PM Overdue --}}
                <div class="col-xl-3 col-md-6">
                    <div class="card card-stat bg-body border-0 shadow-sm h-100">
                        <div class="card-body d-flex align-items-center p-6">
                            <div class="symbol symbol-50px me-5">
                                <span class="symbol-label bg-light-danger">
                                    <i class="bi bi-x-octagon fs-2x text-danger"></i>
                                </span>
                            </div>
                            <div class="flex-grow-1">
                                <div class="fw-bolder fs-2x text-gray-800"
                                     data-kt-countup="true"
                                     data-kt-countup-value="{{ $schedulesOverdue }}">0</div>
                                <div class="fw-bold fs-7 text-gray-400">PM Terlambat</div>
                            </div>
                        </div>
                        <div class="card-footer p-3 bg-light-danger rounded-bottom">
                            <span class="text-danger fw-bold fs-8">
                                <i class="bi bi-exclamation-circle me-1"></i>Perlu tindakan segera
                            </span>
                        </div>
                    </div>
                </div>

            </div>{{-- /ROW 1 --}}

            {{-- ═══════════════════════════════════════════════════════════
                 ROW 2 — STAT CARDS SEKUNDER + CHART
            ════════════════════════════════════════════════════════════ --}}
            <div class="row g-5 g-xl-8 mb-5">

                {{-- Mini stats kiri --}}
                <div class="col-xl-4">
                    <div class="card shadow-sm h-100">
                        <div class="card-header border-0 pt-5">
                            <h3 class="card-title fw-bolder text-gray-800">Status Pekerjaan</h3>
                        </div>
                        <div class="card-body pt-2">

                            {{-- In Progress --}}
                            <div class="d-flex align-items-center mb-5 p-3 rounded bg-light-primary">
                                <div class="symbol symbol-40px me-4">
                                    <span class="symbol-label bg-primary">
                                        <i class="bi bi-tools text-white fs-5"></i>
                                    </span>
                                </div>
                                <div class="flex-grow-1">
                                    <div class="fw-bolder text-gray-800 fs-5"
                                         data-kt-countup="true"
                                         data-kt-countup-value="{{ $recordsInProgress }}">0</div>
                                    <div class="text-muted fw-bold fs-7">Sedang Dikerjakan</div>
                                </div>
                                <span class="badge badge-light-primary fw-bolder px-3 py-2">In Progress</span>
                            </div>

                            {{-- Menunggu Validasi --}}
                            <div class="d-flex align-items-center mb-5 p-3 rounded bg-light-warning">
                                <div class="symbol symbol-40px me-4">
                                    <span class="symbol-label bg-warning">
                                        <i class="bi bi-clipboard-check text-white fs-5"></i>
                                    </span>
                                </div>
                                <div class="flex-grow-1">
                                    <div class="fw-bolder text-gray-800 fs-5"
                                         data-kt-countup="true"
                                         data-kt-countup-value="{{ $recordsNeedValidation }}">0</div>
                                    <div class="text-muted fw-bold fs-7">Menunggu Validasi</div>
                                </div>
                                <span class="badge badge-light-warning fw-bolder px-3 py-2">Review</span>
                            </div>

                            {{-- Selesai bulan ini --}}
                            <div class="d-flex align-items-center p-3 rounded bg-light-success">
                                <div class="symbol symbol-40px me-4">
                                    <span class="symbol-label bg-success">
                                        <i class="bi bi-check2-all text-white fs-5"></i>
                                    </span>
                                </div>
                                <div class="flex-grow-1">
                                    <div class="fw-bolder text-gray-800 fs-5"
                                         data-kt-countup="true"
                                         data-kt-countup-value="{{ $recordsCompletedThisMonth }}">0</div>
                                    <div class="text-muted fw-bold fs-7">Selesai Bulan Ini</div>
                                </div>
                                <span class="badge badge-light-success fw-bolder px-3 py-2">Done</span>
                            </div>

                        </div>
                    </div>
                </div>

                {{-- Donut chart PM Cycle --}}
                <div class="col-xl-3">
                    <div class="card shadow-sm h-100">
                        <div class="card-header border-0 pt-5">
                            <h3 class="card-title fw-bolder text-gray-800">Distribusi PM Cycle</h3>
                        </div>
                        <div class="card-body d-flex flex-column align-items-center justify-content-center pt-2">
                            <div class="position-relative" style="width:200px;height:200px;">
                                <canvas id="pmCycleChart"></canvas>
                                <div class="donut-center">
                                    <div class="fw-bolder fs-2 text-gray-800">{{ array_sum($cycleData) }}</div>
                                    <div class="text-muted fs-8">Total</div>
                                </div>
                            </div>
                            <div class="d-flex gap-4 mt-4">
                                @foreach(['6M' => '#009EF7', '1Y' => '#50CD89', '2Y' => '#F1416C'] as $label => $color)
                                <div class="d-flex align-items-center">
                                    <div class="rounded-circle me-2" style="width:10px;height:10px;background:{{ $color }}"></div>
                                    <span class="text-muted fs-8 fw-bold">{{ $label }}</span>
                                </div>
                                @endforeach
                            </div>
                        </div>
                    </div>
                </div>

                {{-- Bar chart PM per bulan --}}
                <div class="col-xl-5">
                    <div class="card shadow-sm h-100">
                        <div class="card-header border-0 pt-5">
                            <h3 class="card-title fw-bolder text-gray-800">PM 6 Bulan Terakhir</h3>
                        </div>
                        <div class="card-body pt-2">
                            <canvas id="pmTrendChart" style="height:200px;"></canvas>
                        </div>
                    </div>
                </div>

            </div>{{-- /ROW 2 --}}

            {{-- ═══════════════════════════════════════════════════════════
                 ROW 3 — TABEL JADWAL TERDEKAT
            ════════════════════════════════════════════════════════════ --}}
            <div class="row g-5 g-xl-8 mb-5">
                <div class="col-12">
                    <div class="card shadow-sm">
                        <div class="card-header border-0 pt-5">
                            <h3 class="card-title fw-bolder text-gray-800">
                                <i class="bi bi-calendar-event text-primary me-2"></i>Jadwal PM Terdekat
                            </h3>
                            <div class="card-toolbar">
                                {{-- <a href="{{ route('admin.maintenance-schedule.index') }}"
                                   class="btn btn-sm btn-light-primary">
                                    Lihat Semua <i class="bi bi-arrow-right ms-1"></i>
                                </a> --}}
                            </div>
                        </div>
                        <div class="card-body pt-0">
                            <div class="table-responsive">
                                <table class="table table-row-bordered gy-4 gs-7 border rounded">
                                    <thead>
                                        <tr class="text-start text-gray-600 fw-bolder fs-7 text-uppercase">
                                            <th class="min-w-50px text-center">No</th>
                                            <th class="min-w-100px">Kode</th>
                                            <th class="min-w-200px">Nama Equipment</th>
                                            <th class="min-w-100px text-center">Lokasi</th>
                                            <th class="min-w-80px text-center">PM Cycle</th>
                                            <th class="min-w-120px text-center">Tanggal PM</th>
                                            <th class="min-w-80px text-center">PM Terakhir</th>
                                            <th class="min-w-100px text-center">Status</th>
                                            <th class="min-w-80px text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody class="fw-bold text-gray-600">
                                        @forelse($upcomingSchedules as $i => $schedule)
                                        <tr class="row-{{ $schedule->status }}">
                                            <td class="text-center">{{ $i + 1 }}</td>
                                            <td>
                                                <span class="badge badge-light-info fw-bold">
                                                    {{ $schedule->equipment_code }}
                                                </span>
                                            </td>
                                            <td class="fw-bolder text-gray-800">{{ $schedule->equipment_name }}</td>
                                            <td class="text-center text-muted">{{ $schedule->location ?? '-' }}</td>
                                            <td class="text-center">
                                                <span class="badge
                                                    @if($schedule->pm_cycle == '6M') badge-light-info
                                                    @elseif($schedule->pm_cycle == '1Y') badge-light-success
                                                    @else badge-light-warning
                                                    @endif fw-bold">
                                                    {{ $schedule->pm_cycle }}
                                                </span>
                                            </td>
                                            <td class="text-center fw-bolder
                                                @if($schedule->status == 'overdue') text-danger
                                                @elseif($schedule->status == 'due') text-warning
                                                @else text-gray-800
                                                @endif">
                                                {{ \Carbon\Carbon::parse($schedule->next_maintenance)->format('d M Y') }}
                                            </td>
                                            <td class="text-center text-muted">
                                                {{ $schedule->last_maintenance
                                                    ? \Carbon\Carbon::parse($schedule->last_maintenance)->format('d M Y')
                                                    : '-' }}
                                            </td>
                                            <td class="text-center">
                                                @if($schedule->status == 'overdue')
                                                    <span class="badge badge-danger badge-overdue-pulse fw-bold px-3 py-2">
                                                        <i class="bi bi-x-octagon me-1"></i>Overdue
                                                    </span>
                                                @elseif($schedule->status == 'due')
                                                    <span class="badge badge-warning fw-bold px-3 py-2">
                                                        <i class="bi bi-alarm me-1"></i>Due
                                                    </span>
                                                @else
                                                    <span class="badge badge-light-secondary fw-bold px-3 py-2">
                                                        Pending
                                                    </span>
                                                @endif
                                            </td>
                                            <td class="text-center">
                                                @if(in_array($schedule->status, ['due', 'overdue']))
                                                    {{-- <a href="{{ route('admin.maintenance-record.create', ['schedule_id' => $schedule->id]) }}"
                                                       class="btn btn-sm btn-primary py-1 px-3">
                                                        <i class="bi bi-play-circle me-1"></i>Mulai PM
                                                    </a> --}}
                                                @else
                                                    {{-- <a href="{{ route('admin.maintenance-schedule.show', $schedule->id) }}"
                                                       class="btn btn-sm btn-light py-1 px-3">
                                                        <i class="bi bi-eye me-1"></i>Detail
                                                    </a> --}}
                                                @endif
                                            </td>
                                        </tr>
                                        @empty
                                        <tr>
                                            <td colspan="9" class="text-center text-muted py-8">
                                                <i class="bi bi-calendar-check fs-2x text-muted mb-3 d-block"></i>
                                                Tidak ada jadwal PM yang perlu diperhatikan
                                            </td>
                                        </tr>
                                        @endforelse
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>{{-- /ROW 3 --}}

            {{-- ═══════════════════════════════════════════════════════════
                 ROW 4 — RECORD AKTIF + EQUIPMENT BERMASALAH
            ════════════════════════════════════════════════════════════ --}}
            <div class="row g-5 g-xl-8">

                {{-- Record In Progress --}}
                <div class="col-xl-7">
                    <div class="card shadow-sm h-100">
                        <div class="card-header border-0 pt-5">
                            <h3 class="card-title fw-bolder text-gray-800">
                                <i class="bi bi-tools text-primary me-2"></i>Pekerjaan Sedang Berjalan
                            </h3>
                            <div class="card-toolbar">
                                {{-- <a href="{{ route('admin.maintenance-record.index') }}"
                                   class="btn btn-sm btn-light-primary">
                                    Lihat Semua <i class="bi bi-arrow-right ms-1"></i>
                                </a> --}}
                            </div>
                        </div>
                        <div class="card-body pt-0">
                            @forelse($activeRecords as $record)
                            {{-- <div class="d-flex align-items-center mb-5 p-4 rounded bg-light hover-bg-light-primary"
                                 style="cursor:pointer"
                                 onclick="window.location='{{ route('admin.maintenance-record.show', $record->id) }}'">
                                <div class="symbol symbol-45px me-4">
                                    <span class="symbol-label bg-light-primary">
                                        <i class="bi bi-gear-wide-connected text-primary fs-4"></i>
                                    </span>
                                </div>
                                <div class="flex-grow-1">
                                    <div class="d-flex justify-content-between">
                                        <span class="fw-bolder text-gray-800 fs-6">{{ $record->equipment_name }}</span>
                                        <span class="badge badge-light-primary fw-bold">In Progress</span>
                                    </div>
                                    <div class="d-flex gap-4 mt-1">
                                        <span class="text-muted fs-7">
                                            <i class="bi bi-hash me-1"></i>{{ $record->record_number }}
                                        </span>
                                        <span class="text-muted fs-7">
                                            <i class="bi bi-person me-1"></i>{{ $record->technician_name }}
                                        </span>
                                        <span class="text-muted fs-7">
                                            <i class="bi bi-clock me-1"></i>
                                            {{ \Carbon\Carbon::parse($record->maintenance_date)->format('d M Y') }}
                                            {{ substr($record->start_time, 0, 5) }}
                                        </span>
                                    </div>
                                </div>
                            </div> --}}
                            @empty
                            <div class="text-center text-muted py-10">
                                <i class="bi bi-tools fs-2x text-muted mb-3 d-block"></i>
                                Tidak ada pekerjaan yang sedang berjalan
                            </div>
                            @endforelse
                        </div>
                    </div>
                </div>

                {{-- Equipment Bermasalah --}}
                <div class="col-xl-5">
                    <div class="card shadow-sm h-100">
                        <div class="card-header border-0 pt-5">
                            <h3 class="card-title fw-bolder text-gray-800">
                                <i class="bi bi-exclamation-triangle text-danger me-2"></i>Equipment Bermasalah
                            </h3>
                            <div class="card-toolbar">
                                {{-- <a href="{{ route('admin.equipment.index') }}"
                                   class="btn btn-sm btn-light-danger">
                                    Lihat Semua <i class="bi bi-arrow-right ms-1"></i>
                                </a> --}}
                            </div>
                        </div>
                        <div class="card-body pt-0">
                            @forelse($equipmentIssues as $eq)
                            <div class="d-flex align-items-center mb-4 p-3 rounded
                                {{ $eq->status == 'maintenance' ? 'bg-light-warning' : 'bg-light-danger' }}">
                                <div class="symbol symbol-40px me-3">
                                    <span class="symbol-label {{ $eq->status == 'maintenance' ? 'bg-warning' : 'bg-danger' }}">
                                        <i class="bi bi-cpu text-white fs-5"></i>
                                    </span>
                                </div>
                                <div class="flex-grow-1">
                                    <div class="fw-bolder text-gray-800 fs-7">{{ $eq->equipment_name }}</div>
                                    <div class="text-muted fs-8">
                                        {{ $eq->equipment_code }}
                                        @if($eq->location) · {{ $eq->location }} @endif
                                    </div>
                                </div>
                                <span class="badge
                                    @if($eq->status == 'maintenance') badge-warning
                                    @else badge-danger
                                    @endif fw-bold text-uppercase fs-9">
                                    {{ $eq->status }}
                                </span>
                            </div>
                            @empty
                            <div class="text-center text-muted py-10">
                                <i class="bi bi-check-circle fs-2x text-success mb-3 d-block"></i>
                                Semua equipment dalam kondisi baik
                            </div>
                            @endforelse
                        </div>
                    </div>
                </div>

            </div>{{-- /ROW 4 --}}

        </div>{{-- /container --}}
    </div>
</div>
@endsection

@push('scripts')
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
@endpush

@push('scripts')
<script>
// ============================================================
// COUNT UP ANIMATION (sama persis seperti contoh Anda)
// ============================================================
var KTCountUp = function () {
    var init = function () {
        document.querySelectorAll('[data-kt-countup="true"]').forEach(function (el) {
            var value    = parseFloat((el.getAttribute('data-kt-countup-value') || '0').replace(/,/g, ''));
            var decimals = parseInt(el.getAttribute('data-kt-countup-decimals') || '0');
            var prefix   = el.getAttribute('data-kt-countup-prefix') || '';
            var count    = new countUp.CountUp(el, value, {
                startVal: 0, duration: 2, prefix: prefix, decimals: decimals
            });
            count.start();
        });
    };
    return { init: init };
}();

// ============================================================
// DONUT CHART — PM Cycle
// ============================================================
var KTPMCycleChart = function () {
    var init = function () {
        var el = document.getElementById('pmCycleChart');
        if (!el) return;

        new Chart(el, {
            type: 'doughnut',
            data: {
                labels: @json($cycleLabels),
                datasets: [{
                    data: @json($cycleData),
                    backgroundColor: ['#009EF7', '#50CD89', '#F1416C'],
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '70%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: 10,
                        callbacks: {
                            label: function (ctx) {
                                var total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                var pct   = total ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                                return ctx.label + ': ' + ctx.parsed + ' (' + pct + '%)';
                            }
                        }
                    }
                }
            }
        });
    };
    return { init: init };
}();

// ============================================================
// BAR CHART — PM Trend 6 Bulan
// ============================================================
var KTPMTrendChart = function () {
    var init = function () {
        var el = document.getElementById('pmTrendChart');
        if (!el) return;

        new Chart(el, {
            type: 'bar',
            data: {
                labels: @json($chartLabels),
                datasets: [
                    {
                        label: 'Selesai (Validated)',
                        data: @json($chartSelesai),
                        backgroundColor: 'rgba(80,205,137,0.85)',
                        borderRadius: 4,
                        borderSkipped: false,
                    },
                    {
                        label: 'Berjalan / Review',
                        data: @json($chartBerjalan),
                        backgroundColor: 'rgba(0,158,247,0.75)',
                        borderRadius: 4,
                        borderSkipped: false,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: { size: 11, family: 'Inter, Helvetica, sans-serif' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: 10,
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        stacked: false,
                        grid: { display: false },
                        ticks: { font: { size: 11 } }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: { size: 11 }
                        },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    }
                }
            }
        });
    };
    return { init: init };
}();

// ============================================================
// INITIALIZE SEMUA
// ============================================================
KTUtil.onDOMContentLoaded(function () {
    KTCountUp.init();
    KTPMCycleChart.init();
    KTPMTrendChart.init();
});
</script>
@endpush