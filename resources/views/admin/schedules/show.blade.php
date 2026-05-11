{{-- resources/views/admin/maintenance/schedule/show.blade.php --}}
@extends('layouts.app')

@section('title', 'Detail Jadwal PM — ' . $schedule->equipment_name)

@push('styles')
<style>
/* ── Status badge helpers ── */
.badge-pending   { background: #e8f4fd; color: #0095e8; }
.badge-due       { background: #fff4de; color: #d07800; }
.badge-overdue   { background: #ffeef3; color: #d9214e; }
.badge-completed { background: #e8fff3; color: #1a8754; }

/* ── Countdown box ── */
.countdown-box {
    border-radius: 12px; padding: 24px;
    text-align: center;
}
.countdown-box.status-overdue  { background: linear-gradient(135deg,#ffeef3,#ffe0e8); border: 1px solid #f1c0cc; }
.countdown-box.status-due      { background: linear-gradient(135deg,#fff8e6,#fff3cd); border: 1px solid #ffd97d; }
.countdown-box.status-pending  { background: linear-gradient(135deg,#eef6ff,#ddeeff); border: 1px solid #b3d4f5; }
.countdown-box.status-completed{ background: linear-gradient(135deg,#efffef,#d4f5e0); border: 1px solid #a3d9b1; }
.countdown-number { font-size: 3rem; font-weight: 800; line-height: 1; }

/* ── History table row hover ── */
.history-row:hover { background: #f5f8ff !important; cursor: pointer; }

/* ── Cycle timeline ── */
.cycle-bar { height: 8px; border-radius: 999px; background: #eff2f5; overflow: hidden; }
.cycle-fill { height: 100%; border-radius: 999px; transition: width .6s ease; }

/* ── Info grid ── */
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 576px) { .info-grid { grid-template-columns: 1fr; } }

.info-item label { font-size: .72rem; font-weight: 600; color: #a1a5b7;
    text-transform: uppercase; letter-spacing: .04em; display: block; margin-bottom: 2px; }
.info-item .val  { font-size: .9rem; font-weight: 600; color: #181c32; }
</style>
@endpush

@section('content')

{{-- ── BREADCRUMB + HEADER ── --}}
<div class="d-flex align-items-start justify-content-between mb-6 flex-wrap gap-3">
    <div class="d-flex align-items-center gap-3">
        <a href="{{ route('admin.schedules.index') }}" class="btn btn-sm btn-light">
            <i class="bi bi-arrow-left"></i>
        </a>
        <div>
            <div class="text-muted fs-8 mb-1">
                <a href="{{ route('admin.schedules.index') }}" class="text-muted text-hover-primary">
                    Jadwal PM
                </a>
                <i class="bi bi-chevron-right mx-1" style="font-size:.6rem"></i>
                Detail
            </div>
            <h1 class="fs-2 fw-bold text-gray-900 mb-0">{{ $schedule->equipment_name }}</h1>
            <div class="text-muted fs-6">
                {{ $schedule->equipment_code }}
                @if($schedule->etm_group)
                    · <span class="text-primary">{{ $schedule->etm_group }}</span>
                @endif
                @if($schedule->location)
                    · {{ $schedule->location }}
                @endif
            </div>
        </div>
    </div>

    <div class="d-flex gap-2 flex-wrap">
        <a href="{{ route('admin.equipment.show', $schedule->equipment_id) }}"
           class="btn btn-light-primary btn-sm">
            <i class="bi bi-cpu me-1"></i>Lihat Equipment
        </a>
        @if(in_array($schedule->status, ['due', 'overdue']))
        <a href="{{ route('admin.records.create', ['schedule_id' => $schedule->id]) }}"
           class="btn btn-danger btn-sm">
            <i class="bi bi-play-fill me-1"></i>Mulai PM Sekarang
        </a>
        @endif
    </div>
</div>

@if(session('success'))
<div class="alert alert-success d-flex align-items-center mb-5">
    <i class="bi bi-check-circle me-3 fs-4"></i>
    <div>{{ session('success') }}</div>
</div>
@endif

<div class="row g-5">

    {{-- ══════════════════════════════════════════════
         KOLOM KIRI — Info + Countdown + Template
    ══════════════════════════════════════════════ --}}
    <div class="col-lg-4">

        {{-- Countdown Card --}}
        @php
            $daysLeft  = now()->diffInDays($schedule->next_maintenance, false);
            $isLate    = $daysLeft < 0;
            $isToday   = $daysLeft === 0;
            $statusKey = $schedule->status; // pending|due|overdue|completed
        @endphp
        <div class="card card-flush border-0 shadow-sm mb-5">
            <div class="card-body p-0">
                <div class="countdown-box status-{{ $statusKey }}">
                    @if($isLate)
                        <div class="countdown-number text-danger">{{ abs($daysLeft) }}</div>
                        <div class="fw-bold text-danger mt-1">hari terlambat</div>
                        <div class="text-muted fs-8 mt-1">
                            Jadwal: {{ \Carbon\Carbon::parse($schedule->next_maintenance)->format('d M Y') }}
                        </div>
                    @elseif($isToday)
                        <div class="countdown-number text-warning">0</div>
                        <div class="fw-bold text-warning mt-1">Jadwal hari ini!</div>
                        <div class="text-muted fs-8 mt-1">
                            {{ \Carbon\Carbon::parse($schedule->next_maintenance)->format('d M Y') }}
                        </div>
                    @elseif($statusKey === 'completed')
                        <div class="countdown-number text-success">
                            <i class="bi bi-check-circle-fill" style="font-size:2.5rem"></i>
                        </div>
                        <div class="fw-bold text-success mt-2">PM Selesai</div>
                        <div class="text-muted fs-8 mt-1">
                            Next: {{ \Carbon\Carbon::parse($schedule->next_maintenance)->format('d M Y') }}
                        </div>
                    @else
                        <div class="countdown-number text-primary">{{ $daysLeft }}</div>
                        <div class="fw-bold text-primary mt-1">hari lagi</div>
                        <div class="text-muted fs-8 mt-1">
                            Jadwal: {{ \Carbon\Carbon::parse($schedule->next_maintenance)->format('d M Y') }}
                        </div>
                    @endif

                    <div class="mt-3">
                        @php
                            $stMap = [
                                'pending'   => ['class' => 'badge-pending',   'label' => 'Pending'],
                                'due'       => ['class' => 'badge-due',       'label' => 'Due — Segera Kerjakan'],
                                'overdue'   => ['class' => 'badge-overdue',   'label' => 'Overdue — Terlambat!'],
                                'completed' => ['class' => 'badge-completed', 'label' => 'Completed'],
                            ];
                            $st = $stMap[$statusKey] ?? ['class' => 'badge-secondary', 'label' => ucfirst($statusKey)];
                        @endphp
                        <span class="badge {{ $st['class'] }} fw-semibold px-3 py-2 fs-7">
                            {{ $st['label'] }}
                        </span>
                    </div>
                </div>

                {{-- Cycle progress bar --}}
                @if($schedule->last_maintenance && $schedule->interval_days)
                @php
                    $cycleStart  = \Carbon\Carbon::parse($schedule->last_maintenance);
                    $cycleEnd    = \Carbon\Carbon::parse($schedule->next_maintenance);
                    $cycleTotal  = $cycleStart->diffInDays($cycleEnd);
                    $cycleDone   = $cycleStart->diffInDays(now());
                    $cyclePct    = $cycleTotal > 0 ? min(100, round(($cycleDone / $cycleTotal) * 100)) : 0;
                @endphp
                <div class="px-5 pb-5 pt-3">
                    <div class="d-flex justify-content-between fs-8 text-muted mb-1">
                        <span>Cycle Progress</span>
                        <span>{{ $cyclePct }}%</span>
                    </div>
                    <div class="cycle-bar">
                        <div class="cycle-fill
                            {{ $cyclePct >= 100 ? 'bg-danger' : ($cyclePct >= 80 ? 'bg-warning' : 'bg-success') }}"
                            style="width: {{ $cyclePct }}%"></div>
                    </div>
                    <div class="d-flex justify-content-between fs-8 text-muted mt-1">
                        <span>{{ $cycleStart->format('d M Y') }}</span>
                        <span>{{ $cycleEnd->format('d M Y') }}</span>
                    </div>
                </div>
                @endif
            </div>
        </div>

        {{-- Info Detail Jadwal --}}
        <div class="card card-flush border-0 shadow-sm mb-5">
            <div class="card-header border-0 pt-5">
                <h3 class="card-title fw-bold fs-6">
                    <i class="bi bi-info-circle me-2 text-primary"></i>Info Jadwal
                </h3>
            </div>
            <div class="card-body pt-2">
                <div class="info-grid">
                    <div class="info-item">
                        <label>PM Cycle</label>
                        <div class="val">
                            <span class="badge badge-light-primary">{{ $schedule->pm_cycle }}</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <label>Interval</label>
                        <div class="val">
                            {{ $schedule->interval_days ? $schedule->interval_days . ' hari' : '—' }}
                        </div>
                    </div>
                    <div class="info-item">
                        <label>Next Maintenance</label>
                        <div class="val {{ $isLate ? 'text-danger' : '' }}">
                            {{ \Carbon\Carbon::parse($schedule->next_maintenance)->format('d M Y') }}
                        </div>
                    </div>
                    <div class="info-item">
                        <label>Last Maintenance</label>
                        <div class="val">
                            {{ $schedule->last_maintenance
                                ? \Carbon\Carbon::parse($schedule->last_maintenance)->format('d M Y')
                                : '—' }}
                        </div>
                    </div>
                    <div class="info-item">
                        <label>Status Equipment</label>
                        <div class="val">
                            @php
                                $eqStMap = [
                                    'active'      => ['class' => 'badge-light-success', 'label' => 'Active'],
                                    'inactive'    => ['class' => 'badge-light-secondary','label' => 'Inactive'],
                                    'maintenance' => ['class' => 'badge-light-warning',  'label' => 'Maintenance'],
                                ];
                                $eqSt = $eqStMap[$schedule->equipment_status] ?? ['class' => 'badge-light', 'label' => $schedule->equipment_status];
                            @endphp
                            <span class="badge {{ $eqSt['class'] }}">{{ $eqSt['label'] }}</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <label>Lokasi</label>
                        <div class="val">{{ $schedule->location ?: '—' }}</div>
                    </div>
                </div>
            </div>
        </div>

        {{-- Template yang tersedia --}}
        @if($templates->isNotEmpty())
        <div class="card card-flush border-0 shadow-sm">
            <div class="card-header border-0 pt-5">
                <h3 class="card-title fw-bold fs-6">
                    <i class="bi bi-file-earmark-check me-2 text-primary"></i>
                    Check Sheet Template
                </h3>
            </div>
            <div class="card-body pt-2">
                @foreach($templates as $tpl)
                @php
                    $itemCount = DB::table('check_sheet_items')
                        ->where('template_id', $tpl->id)
                        ->where('is_active', 1)
                        ->count();
                @endphp
                <div class="d-flex align-items-start gap-3 mb-3 pb-3
                    {{ !$loop->last ? 'border-bottom' : '' }}">
                    <div class="symbol symbol-40px">
                        <div class="symbol-label bg-light-primary">
                            <i class="bi bi-file-text fs-5 text-primary"></i>
                        </div>
                    </div>
                    <div class="flex-grow-1">
                        <div class="fw-bold text-gray-800 fs-7">{{ $tpl->template_name }}</div>
                        <div class="text-muted fs-8">#{{ $tpl->doc_number }}</div>
                        <div class="d-flex gap-2 mt-1">
                            <span class="badge badge-light-primary fs-8">{{ $tpl->pm_cycle }}</span>
                            <span class="badge badge-light-info fs-8">
                                {{ $itemCount }} item
                            </span>
                        </div>
                    </div>
                </div>
                @endforeach

                @if(in_array($schedule->status, ['due', 'overdue']))
                <a href="{{ route('admin.records.create', ['schedule_id' => $schedule->id]) }}"
                   class="btn btn-danger w-100 mt-2">
                    <i class="bi bi-play-fill me-1"></i>Mulai PM dengan Template Ini
                </a>
                @endif
            </div>
        </div>
        @else
        <div class="card card-flush border-0 shadow-sm">
            <div class="card-body text-center py-6">
                <i class="bi bi-file-earmark-x fs-1 text-muted mb-3 d-block"></i>
                <div class="text-muted fs-7">Belum ada template check sheet</div>
                <div class="text-muted fs-8">untuk cycle {{ $schedule->pm_cycle }}</div>
            </div>
        </div>
        @endif

    </div>

    {{-- ══════════════════════════════════════════════
         KOLOM KANAN — Riwayat Record
    ══════════════════════════════════════════════ --}}
    <div class="col-lg-8">

        {{-- Stat mini ── --}}
        @php
            $totalDone      = $records->whereIn('status', ['completed', 'validated'])->count();
            $totalValidated = $records->where('status', 'validated')->count();
            $totalRejected  = $records->where('status', 'rejected')->count();
            $totalAll       = $records->count();
        @endphp
        <div class="row g-4 mb-5">
            @foreach([
                ['label' => 'Total Record',  'value' => $totalAll,       'color' => 'primary', 'icon' => 'bi-file-earmark'],
                ['label' => 'Selesai',       'value' => $totalDone,      'color' => 'info',    'icon' => 'bi-clipboard-check'],
                ['label' => 'Validated',     'value' => $totalValidated, 'color' => 'success', 'icon' => 'bi-patch-check'],
                ['label' => 'Rejected',      'value' => $totalRejected,  'color' => 'danger',  'icon' => 'bi-x-circle'],
            ] as $sc)
            <div class="col-6 col-md-3">
                <div class="card card-flush border-0 shadow-sm h-100">
                    <div class="card-body py-4 px-4 d-flex align-items-center gap-3">
                        <div class="symbol symbol-40px">
                            <div class="symbol-label bg-light-{{ $sc['color'] }}">
                                <i class="bi {{ $sc['icon'] }} fs-4 text-{{ $sc['color'] }}"></i>
                            </div>
                        </div>
                        <div>
                            <div class="fs-3 fw-bold text-gray-900">{{ $sc['value'] }}</div>
                            <div class="fs-8 text-muted">{{ $sc['label'] }}</div>
                        </div>
                    </div>
                </div>
            </div>
            @endforeach
        </div>

        {{-- Riwayat Record Table --}}
        <div class="card card-flush border-0 shadow-sm">
            <div class="card-header border-0 pt-5">
                <h3 class="card-title fw-bold fs-5">
                    <i class="bi bi-clock-history me-2 text-primary"></i>
                    Riwayat Pelaksanaan PM
                </h3>
                <div class="card-toolbar">
                    @if(in_array($schedule->status, ['due', 'overdue']))
                    <a href="{{ route('admin.records.create', ['schedule_id' => $schedule->id]) }}"
                       class="btn btn-sm btn-danger">
                        <i class="bi bi-plus-circle me-1"></i>Buat Record Baru
                    </a>
                    @endif
                </div>
            </div>
            <div class="card-body pt-0">
                @if($records->isEmpty())
                <div class="text-center py-10">
                    <i class="bi bi-clipboard-x fs-1 text-muted mb-3 d-block"></i>
                    <p class="text-muted mb-1">Belum ada riwayat pelaksanaan PM</p>
                    <p class="text-muted fs-8">untuk jadwal ini.</p>
                    @if(in_array($schedule->status, ['due', 'overdue']))
                    <a href="{{ route('admin.records.create', ['schedule_id' => $schedule->id]) }}"
                       class="btn btn-sm btn-danger mt-2">
                        <i class="bi bi-play-fill me-1"></i>Mulai PM Pertama
                    </a>
                    @endif
                </div>
                @else
                <div class="table-responsive">
                    <table class="table table-row-dashed table-row-gray-200 align-middle gs-0 gy-3">
                        <thead>
                            <tr class="fw-bold text-muted fs-7 text-uppercase">
                                <th class="ps-2">No Record</th>
                                <th>Tanggal</th>
                                <th>Teknisi</th>
                                <th>Checker</th>
                                <th>Durasi</th>
                                <th>Status</th>
                                <th class="text-end pe-2">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($records as $rec)
                            @php
                                $recStatusMap = [
                                    'in_progress' => ['class' => 'badge-light-warning', 'label' => 'In Progress',  'icon' => 'bi-hourglass-split'],
                                    'completed'   => ['class' => 'badge-light-info',    'label' => 'Menunggu Cek', 'icon' => 'bi-clipboard-check'],
                                    'validated'   => ['class' => 'badge-light-success', 'label' => 'Validated',    'icon' => 'bi-patch-check'],
                                    'rejected'    => ['class' => 'badge-light-danger',  'label' => 'Rejected',     'icon' => 'bi-x-circle'],
                                ];
                                $rst = $recStatusMap[$rec->status] ?? ['class' => 'badge-light', 'label' => $rec->status, 'icon' => 'bi-circle'];

                                $duration = null;
                                if ($rec->start_time && $rec->end_time) {
                                    $start    = \Carbon\Carbon::parse($rec->maintenance_date . ' ' . $rec->start_time);
                                    $end      = \Carbon\Carbon::parse($rec->maintenance_date . ' ' . $rec->end_time);
                                    $mins     = $start->diffInMinutes($end);
                                    $duration = $mins >= 60
                                        ? floor($mins / 60) . 'j ' . ($mins % 60) . 'm'
                                        : $mins . ' mnt';
                                }
                            @endphp
                            <tr class="history-row"
                                onclick="window.location='{{ route('admin.records.show', $rec->id) }}'">
                                <td class="ps-2">
                                    <span class="fw-bold text-primary fs-7">{{ $rec->record_number }}</span>
                                    <div class="text-muted fs-8">{{ $rec->pm_cycle }}</div>
                                </td>
                                <td>
                                    <div class="fw-semibold fs-7">
                                        {{ \Carbon\Carbon::parse($rec->maintenance_date)->format('d M Y') }}
                                    </div>
                                    <div class="text-muted fs-8">{{ $rec->start_time }}</div>
                                </td>
                                <td class="text-muted fs-7">{{ $rec->technician_name }}</td>
                                <td class="text-muted fs-7">{{ $rec->checker_name ?? '—' }}</td>
                                <td class="text-muted fs-7">
                                    @if($duration)
                                        {{ $duration }}
                                    @elseif($rec->status === 'in_progress')
                                        <span class="text-warning fs-8">Running...</span>
                                    @else
                                        —
                                    @endif
                                </td>
                                <td>
                                    <span class="badge {{ $rst['class'] }} fw-semibold px-2 py-1 fs-8">
                                        <i class="bi {{ $rst['icon'] }} me-1"></i>{{ $rst['label'] }}
                                    </span>
                                </td>
                                <td class="text-end pe-2" onclick="event.stopPropagation()">
                                    <div class="d-flex justify-content-end gap-1">
                                        @if($rec->status === 'in_progress')
                                        <a href="{{ route('admin.records.work', $rec->id) }}"
                                           class="btn btn-sm btn-warning py-1 px-3">
                                            <i class="bi bi-pencil me-1"></i>Kerjakan
                                        </a>
                                        @else
                                        <a href="{{ route('admin.records.show', $rec->id) }}"
                                           class="btn btn-sm btn-light-primary py-1 px-3">
                                            <i class="bi bi-eye me-1"></i>Detail
                                        </a>
                                        @endif
                                    </div>
                                </td>
                            </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>

                {{-- Kosongkan baris jika ada PM yang belum selesai --}}
                @php
                    $inProgressRec = $records->firstWhere('status', 'in_progress');
                @endphp
                @if($inProgressRec)
                <div class="alert alert-light-warning border border-warning border-dashed d-flex gap-3 mt-4">
                    <i class="bi bi-hourglass-split text-warning fs-4 mt-1"></i>
                    <div>
                        <div class="fw-bold text-warning">Ada PM yang sedang berjalan</div>
                        <div class="text-muted fs-8">
                            Record <strong>{{ $inProgressRec->record_number }}</strong>
                            sedang dikerjakan oleh {{ $inProgressRec->technician_name }}.
                        </div>
                        <a href="{{ route('admin.records.work', $inProgressRec->id) }}"
                           class="btn btn-sm btn-warning mt-2">
                            <i class="bi bi-pencil me-1"></i>Lanjutkan
                        </a>
                    </div>
                </div>
                @endif
                @endif
            </div>
        </div>

    </div>
</div>
@endsection