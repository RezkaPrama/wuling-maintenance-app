@extends('layouts.app')

@section('title') Equipment @endsection
@section('subtitle') Detail Equipment @endsection
@section('menuUtama') Menu Utama @endsection
@section('menuItem') Equipment @endsection

@section('styles')
<style>
    /* ── Stat card ──────────────────────────────────────────────────── */
    .card-stat { transition: transform .2s, box-shadow .2s; }
    .card-stat:hover { transform: translateY(-2px); box-shadow: 0 .5rem 1.5rem rgba(0,0,0,.1) !important; }

    /* ── Section title ──────────────────────────────────────────────── */
    .section-title {
        font-size: .7rem; font-weight: 700; letter-spacing: .1em;
        text-transform: uppercase; color: var(--bs-gray-500);
        padding-bottom: 6px; border-bottom: 1px solid var(--bs-gray-200);
        margin-bottom: 16px;
    }

    /* ── QR box ────────────────────────────────────────────────────── */
    .qr-box {
        background: white;
        border: 2px solid var(--bs-gray-200);
        border-radius: 12px;
        padding: 16px;
        display: inline-block;
        box-shadow: 0 4px 12px rgba(0,0,0,.06);
    }

    /* ── Spec table ────────────────────────────────────────────────── */
    .spec-table td { font-size: .82rem; padding: 7px 10px; }
    .spec-table td:first-child { color: var(--bs-gray-600); width: 45%; font-weight: 600; }

    /* ── Status dot ─────────────────────────────────────────────────── */
    .status-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }

    /* ── Badge pulse ─────────────────────────────────────────────────── */
    @keyframes pulse-red { 0%,100%{opacity:1} 50%{opacity:.5} }
    .badge-pulse { animation: pulse-red 1.8s ease-in-out infinite; }

    /* ── Scan frame (animasi blink) ─────────────────────────────────── */
    .scan-frame {
        position: relative;
        border: 3px solid var(--bs-primary);
        border-radius: 8px;
        overflow: hidden;
    }
    .scan-line {
        position: absolute;
        left: 0; right: 0;
        height: 2px;
        background: rgba(0,158,247,.7);
        animation: scan 2s linear infinite;
        box-shadow: 0 0 8px rgba(0,158,247,.8);
    }
    @keyframes scan {
        0%   { top: 0; }
        100% { top: 100%; }
    }

    /* ── History row hover ───────────────────────────────────────────── */
    .history-row:hover td { background: rgba(0,158,247,.04); }
</style>
@endsection

@section('content')
<div class="content d-flex flex-column flex-column-fluid" id="kt_content">
    @include('partials.toolbar')
    <div class="post d-flex flex-column-fluid" id="kt_post">
        <div id="kt_content_container" class="container-xxl">

            {{-- Flash ─────────────────────────────────────────────────────── --}}
            @foreach(['success','error'] as $type)
            @if(session($type))
            <div class="alert alert-{{ $type==='error'?'danger':$type }} d-flex align-items-center p-4 mb-5">
                <i class="bi bi-{{ $type==='error'?'x':'check' }}-circle fs-2 me-3"></i>
                <span>{{ session($type) }}</span>
            </div>
            @endif
            @endforeach

            {{-- ── Header ─────────────────────────────────────────────────── --}}
            <div class="d-flex align-items-start justify-content-between mb-6">
                <div>
                    <div class="d-flex align-items-center gap-3 mb-1">
                        <h1 class="page-heading fw-bold fs-3 text-gray-900 my-0">
                            {{ $equipment->equipment_name }}
                        </h1>
                        @if($equipment->status === 'active')
                            <span class="badge badge-light-success px-3">Aktif</span>
                        @elseif($equipment->status === 'maintenance')
                            <span class="badge badge-light-warning px-3">Maintenance</span>
                        @else
                            <span class="badge badge-light-danger px-3">Inactive</span>
                        @endif
                    </div>
                    <ul class="breadcrumb breadcrumb-separatorless fw-semibold fs-7 mt-1">
                        <li class="breadcrumb-item text-muted">
                            <a href="{{ route('admin.equipment.index') }}" class="text-muted text-hover-primary">Equipment</a>
                        </li>
                        <li class="breadcrumb-item"><span class="bullet bg-gray-500 w-5px h-2px"></span></li>
                        <li class="breadcrumb-item text-muted">{{ $equipment->equipment_name }}</li>
                    </ul>
                </div>
                <div class="d-flex gap-2">
                    <a href="{{ route('admin.equipment.edit', $equipment->id) }}" class="btn btn-light-primary btn-sm">
                        <i class="bi bi-pencil me-1"></i>Edit
                    </a>
                    <a href="{{ route('admin.records.create') }}?equipment_id={{ $equipment->id }}"
                       class="btn btn-primary btn-sm">
                        <i class="bi bi-play-circle me-1"></i>Mulai PM
                    </a>
                </div>
            </div>

            {{-- ── Stat Cards ──────────────────────────────────────────────── --}}
            <div class="row g-4 mb-6">
                @foreach([
                    ['label'=>'Total PM',      'val'=>$totalPMAll,  'icon'=>'bi-clipboard-check', 'color'=>'primary'],
                    ['label'=>'PM Selesai',    'val'=>$totalPMDone, 'icon'=>'bi-check-circle',    'color'=>'success'],
                    ['label'=>'PM Terakhir',   'val'=>$lastRecord ? \Carbon\Carbon::parse($lastRecord->maintenance_date)->format('d M Y') : '-',
                                               'icon'=>'bi-calendar-event', 'color'=>'info'],
                    ['label'=>'Total Jadwal',  'val'=>$schedules->count(), 'icon'=>'bi-calendar3', 'color'=>'warning'],
                ] as $card)
                <div class="col-6 col-lg-3">
                    <div class="card card-stat shadow-sm h-100">
                        <div class="card-body d-flex align-items-center p-5">
                            <div class="symbol symbol-45px me-4">
                                <span class="symbol-label bg-light-{{ $card['color'] }}">
                                    <i class="bi {{ $card['icon'] }} fs-2x text-{{ $card['color'] }}"></i>
                                </span>
                            </div>
                            <div>
                                <div class="fw-bolder fs-4 text-gray-800">{{ $card['val'] }}</div>
                                <div class="text-muted fs-8">{{ $card['label'] }}</div>
                            </div>
                        </div>
                    </div>
                </div>
                @endforeach
            </div>

            {{-- ── ROW UTAMA ───────────────────────────────────────────────── --}}
            <div class="row g-5 mb-5">

                {{-- ── KIRI: Info + Spec ─────────────────────────────────── --}}
                <div class="col-lg-4">

                    {{-- Info Card --}}
                    <div class="card shadow-sm mb-5">
                        <div class="card-body p-6">
                            <div class="section-title">Informasi Equipment</div>
                            <table class="table spec-table mb-0">
                                <tbody>
                                    <tr><td>Kode</td><td><span class="badge badge-light-info fw-bolder">{{ $equipment->equipment_code }}</span></td></tr>
                                    <tr><td>PM Number</td><td>{{ $equipment->pm_number }}</td></tr>
                                    <tr><td>TIS Number</td><td>{{ $equipment->tis_number ?: '-' }}</td></tr>
                                    <tr><td>ETM Group</td><td><span class="badge badge-light-primary fw-bold">{{ $equipment->etm_group }}</span></td></tr>
                                    <tr><td>Lokasi</td><td>{{ $equipment->location ?: '-' }}</td></tr>
                                    <tr>
                                        <td>Status</td>
                                        <td>
                                            @if($equipment->status === 'active')
                                                <span class="d-flex align-items-center gap-2">
                                                    <span class="status-dot bg-success"></span>
                                                    <span class="text-success fw-bold">Aktif</span>
                                                </span>
                                            @elseif($equipment->status === 'maintenance')
                                                <span class="d-flex align-items-center gap-2">
                                                    <span class="status-dot bg-warning"></span>
                                                    <span class="text-warning fw-bold">Maintenance</span>
                                                </span>
                                            @else
                                                <span class="d-flex align-items-center gap-2">
                                                    <span class="status-dot bg-danger"></span>
                                                    <span class="text-danger fw-bold">Inactive</span>
                                                </span>
                                            @endif
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {{-- Spesifikasi Teknis --}}
                    @if($specifications)
                    <div class="card shadow-sm mb-5">
                        <div class="card-body p-6">
                            <div class="section-title">Spesifikasi Teknis</div>
                            <table class="table spec-table mb-0">
                                <tbody>
                                    @foreach($specifications as $key => $val)
                                    <tr>
                                        <td>{{ $key }}</td>
                                        <td class="fw-semibold text-gray-800">{{ $val ?: '-' }}</td>
                                    </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        </div>
                    </div>
                    @endif

                    {{-- Jadwal PM aktif --}}
                    @if($schedules->count())
                    <div class="card shadow-sm">
                        <div class="card-body p-6">
                            <div class="section-title">Jadwal PM</div>
                            @foreach($schedules as $s)
                            @php
                                $st = $s->status ?? 'pending';
                                $stColor = match($st) {
                                    'overdue'   => 'danger',
                                    'due'       => 'warning',
                                    'completed' => 'success',
                                    default     => 'secondary',
                                };
                            @endphp
                            <div class="d-flex align-items-center justify-content-between py-2
                                        {{ !$loop->last ? 'border-bottom border-dashed' : '' }}">
                                <div>
                                    <span class="badge badge-light-primary fw-bold me-2">{{ $s->pm_cycle }}</span>
                                    <span class="text-muted fs-8">
                                        {{ $s->next_maintenance ? \Carbon\Carbon::parse($s->next_maintenance)->format('d M Y') : '-' }}
                                    </span>
                                </div>
                                <span class="badge badge-light-{{ $stColor }} fw-bold fs-9">{{ ucfirst($st) }}</span>
                            </div>
                            @endforeach
                        </div>
                    </div>
                    @endif

                </div>

                {{-- ── TENGAH: QR Code ────────────────────────────────────── --}}
                <div class="col-lg-4">
                    <div class="card shadow-sm h-100">
                        <div class="card-header border-0 pt-6 pb-0">
                            <div class="card-title">
                                <h4 class="fw-bold text-gray-800 mb-0">
                                    <i class="bi bi-qr-code me-2 text-primary"></i>QR Code Equipment
                                </h4>
                            </div>
                        </div>
                        <div class="card-body p-6 d-flex flex-column align-items-center">

                            {{-- QR Code image --}}
                            <div class="qr-box mb-4 text-center">
                                <div class="scan-frame d-inline-block">
                                    <div class="scan-line"></div>
                                    <img src="data:image/svg+xml;base64,{{ $qrCode }}"
                                         width="220" height="220"
                                         alt="QR Code {{ $equipment->equipment_code }}"
                                         id="qr-img">
                                </div>
                                <div class="mt-3">
                                    <div class="fw-bolder text-gray-800 fs-7">{{ $equipment->equipment_code }}</div>
                                    <div class="text-muted fs-9">{{ $equipment->equipment_name }}</div>
                                </div>
                            </div>

                            {{-- URL yang di-encode --}}
                            <div class="alert alert-light-primary w-100 p-3 mb-4">
                                <div class="text-muted fs-9 mb-1 fw-bold">URL Target:</div>
                                <div class="text-primary fs-9 text-break">{{ $qrUrl }}</div>
                            </div>

                            {{-- Petunjuk scan --}}
                            <div class="text-center text-muted fs-8 mb-5 px-4">
                                <i class="bi bi-phone me-1"></i>
                                Scan QR Code ini untuk langsung membuka form pelaksanaan PM equipment ini.
                            </div>

                            {{-- Tombol download --}}
                            <div class="d-flex gap-3 w-100">
                                <a href="{{ route('admin.equipment.qr', $equipment->id) }}"
                                   class="btn btn-primary btn-sm flex-grow-1">
                                    <i class="bi bi-download me-1"></i>Download QR
                                </a>
                                <button type="button" class="btn btn-light-primary btn-sm"
                                        onclick="printQr()" data-bs-toggle="tooltip" title="Print QR">
                                    <i class="bi bi-printer"></i>
                                </button>
                                <button type="button" class="btn btn-light-primary btn-sm"
                                        onclick="copyQrUrl()" data-bs-toggle="tooltip" title="Copy URL">
                                    <i class="bi bi-link-45deg"></i>
                                </button>
                            </div>

                        </div>
                    </div>
                </div>

                {{-- ── KANAN: Chart PM per Tahun ──────────────────────────── --}}
                <div class="col-lg-4">
                    <div class="card shadow-sm h-100">
                        <div class="card-header border-0 pt-6 pb-0">
                            <div class="card-title">
                                <h4 class="fw-bold text-gray-800 mb-0">
                                    <i class="bi bi-bar-chart me-2 text-primary"></i>PM per Tahun
                                </h4>
                            </div>
                        </div>
                        <div class="card-body p-6">
                            @if(count($chartYearLabels) > 0)
                            <canvas id="pmYearChart" height="220"></canvas>
                            @else
                            <div class="text-center text-muted py-10">
                                <i class="bi bi-bar-chart fs-2x text-gray-300 d-block mb-2"></i>
                                Belum ada data maintenance.
                            </div>
                            @endif
                        </div>
                    </div>
                </div>

            </div><!-- /row utama -->

            {{-- ── Riwayat Maintenance ──────────────────────────────────────── --}}
            <div class="card shadow-sm">
                <div class="card-header border-0 pt-6">
                    <div class="card-title">
                        <h4 class="fw-bold text-gray-800 mb-0">
                            <i class="bi bi-clock-history me-2 text-primary"></i>Riwayat Maintenance
                        </h4>
                    </div>
                    {{-- Filter riwayat --}}
                    <div class="card-toolbar">
                        <form method="GET" action="{{ route('admin.equipment.show', $equipment->id) }}"
                              class="d-flex gap-3 align-items-center flex-wrap">
                            <select name="filter_year" class="form-select form-select-sm form-select-solid w-auto"
                                    onchange="this.form.submit()">
                                <option value="">Semua Tahun</option>
                                @foreach($availableYears as $yr)
                                <option value="{{ $yr }}" {{ $filterYear == $yr ? 'selected' : '' }}>{{ $yr }}</option>
                                @endforeach
                            </select>
                            <select name="filter_status" class="form-select form-select-sm form-select-solid w-auto"
                                    onchange="this.form.submit()">
                                <option value="all">Semua Status</option>
                                @foreach(['in_progress'=>'In Progress','completed'=>'Selesai','validated'=>'Validated','rejected'=>'Rejected'] as $val=>$lbl)
                                <option value="{{ $val }}" {{ $filterStatus === $val ? 'selected' : '' }}>{{ $lbl }}</option>
                                @endforeach
                            </select>
                            @if($filterYear || ($filterStatus && $filterStatus !== 'all'))
                            <a href="{{ route('admin.equipment.show', $equipment->id) }}"
                               class="btn btn-sm btn-light-danger">
                                <i class="bi bi-x-lg me-1"></i>Reset
                            </a>
                            @endif
                        </form>
                    </div>
                </div>

                <div class="card-body pt-3">
                    <div class="table-responsive">
                        <table class="table table-row-bordered gy-4 gs-7">
                            <thead>
                                <tr class="text-start text-gray-600 fw-bolder fs-7 text-uppercase">
                                    <th>No. Record</th>
                                    <th>Tanggal</th>
                                    <th>PM Cycle</th>
                                    <th>Teknisi</th>
                                    <th>Checker</th>
                                    <th>Durasi</th>
                                    <th>Status</th>
                                    <th class="text-end">Aksi</th>
                                </tr>
                            </thead>
                            <tbody class="fw-bold text-gray-600">
                                @forelse($maintenanceHistory as $h)
                                <tr class="history-row">
                                    <td>
                                        <div class="fw-bold text-gray-800">{{ $h->record_number }}</div>
                                        <div class="text-muted fs-9">{{ $h->template_name ?? '-' }}</div>
                                    </td>
                                    <td>
                                        {{ \Carbon\Carbon::parse($h->maintenance_date)->format('d M Y') }}
                                        <div class="text-muted fs-9">{{ $h->start_time ?? '' }}</div>
                                    </td>
                                    <td>
                                        <span class="badge badge-light-primary fw-bold">{{ $h->pm_cycle ?? '-' }}</span>
                                    </td>
                                    <td class="text-muted">{{ $h->technician_name }}</td>
                                    <td class="text-muted">{{ $h->checker_name ?? '-' }}</td>
                                    <td class="text-muted fs-8">
                                        @if($h->start_time && $h->end_time)
                                        @php
                                            $start = \Carbon\Carbon::parse($h->maintenance_date . ' ' . $h->start_time);
                                            $end   = \Carbon\Carbon::parse($h->maintenance_date . ' ' . $h->end_time);
                                            $diff  = $start->diffInMinutes($end);
                                        @endphp
                                        {{ $diff }} menit
                                        @else
                                        -
                                        @endif
                                    </td>
                                    <td>
                                        @php
                                            $stMap = [
                                                'in_progress' => ['In Progress', 'warning'],
                                                'completed'   => ['Selesai',     'success'],
                                                'validated'   => ['Validated',   'primary'],
                                                'rejected'    => ['Rejected',    'danger'],
                                            ];
                                            [$stLabel, $stColor] = $stMap[$h->status] ?? [$h->status, 'secondary'];
                                        @endphp
                                        <span class="badge badge-light-{{ $stColor }} fw-bold px-3">{{ $stLabel }}</span>
                                    </td>
                                    <td class="text-end">
                                        <a href="{{ route('admin.records.show', $h->id) }}"
                                           class="btn btn-sm btn-icon btn-light-primary"
                                           data-bs-toggle="tooltip" title="Lihat Record">
                                            <i class="bi bi-eye"></i>
                                        </a>
                                    </td>
                                </tr>
                                @empty
                                <tr>
                                    <td colspan="8" class="text-center text-muted py-10">
                                        <i class="bi bi-clock-history fs-2x text-gray-300 d-block mb-2"></i>
                                        Belum ada riwayat maintenance.
                                    </td>
                                </tr>
                                @endforelse
                            </tbody>
                        </table>
                    </div>

                    @if($maintenanceHistory->hasPages())
                    <div class="d-flex justify-content-between align-items-center mt-4">
                        <div class="text-muted fs-7">
                            Menampilkan {{ $maintenanceHistory->firstItem() }}–{{ $maintenanceHistory->lastItem() }}
                            dari {{ $maintenanceHistory->total() }} record
                        </div>
                        {{ $maintenanceHistory->links('pagination::bootstrap-5') }}
                    </div>
                    @endif
                </div>
            </div><!-- /riwayat maintenance -->

        </div>
    </div>
</div>
@endsection

@push('scripts')
{{-- Chart.js (sudah include di template Metronic biasanya, jika belum uncomment baris ini) --}}
{{-- <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script> --}}

<script>
KTUtil.onDOMContentLoaded(function () {

    // ── Chart PM per Tahun ────────────────────────────────────────────
    @if(count($chartYearLabels) > 0)
    const ctx = document.getElementById('pmYearChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: @json($chartYearLabels),
            datasets: [
                {
                    label: 'Total PM',
                    data:  @json($chartYearTotal),
                    backgroundColor: 'rgba(0, 158, 247, 0.2)',
                    borderColor:     'rgba(0, 158, 247, 1)',
                    borderWidth: 2,
                    borderRadius: 4,
                },
                {
                    label: 'Validated',
                    data:  @json($chartYearValidated),
                    backgroundColor: 'rgba(80, 205, 137, 0.2)',
                    borderColor:     'rgba(80, 205, 137, 1)',
                    borderWidth: 2,
                    borderRadius: 4,
                },
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 11 } } },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    grid: { color: 'rgba(0,0,0,.05)' },
                },
                x: { grid: { display: false } },
            },
        }
    });
    @endif

    // ── Tooltips ──────────────────────────────────────────────────────
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
        new bootstrap.Tooltip(el);
    });
});

// ── Print QR Code ─────────────────────────────────────────────────────────
function printQr() {
    const img = document.getElementById('qr-img');
    const win = window.open('', '_blank', 'width=400,height=500');
    win.document.write(`
        <html><head><title>QR Code — {{ $equipment->equipment_code }}</title>
        <style>
            body { margin:0; display:flex; flex-direction:column; align-items:center;
                   justify-content:center; min-height:100vh; font-family:sans-serif; }
            img { width:280px; height:280px; }
            h3 { margin:12px 0 4px; font-size:1rem; }
            p  { margin:0; color:#666; font-size:.8rem; }
        </style></head>
        <body onload="window.print()">
            <img src="${img.src}" alt="QR">
            <h3>{{ $equipment->equipment_code }}</h3>
            <p>{{ $equipment->equipment_name }}</p>
        </body></html>
    `);
    win.document.close();
}

// ── Copy URL QR ke clipboard ──────────────────────────────────────────────
function copyQrUrl() {
    const url = '{{ $qrUrl }}';
    navigator.clipboard.writeText(url).then(() => {
        // Gunakan alert sederhana atau toast Metronic jika tersedia
        if (typeof KTToastr !== 'undefined') {
            KTToastr.success('URL berhasil disalin!');
        } else {
            alert('URL disalin ke clipboard:\n' + url);
        }
    });
}
</script>
@endpush