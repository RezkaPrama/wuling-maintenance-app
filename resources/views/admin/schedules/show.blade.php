@extends('layouts.app')

@section('title') Jadwal PM @endsection
@section('subtitle') Detail Jadwal PM @endsection
@section('menuUtama') Menu Utama @endsection
@section('menuItem') Schedule PM @endsection

@section('styles')
<style>
    .section-title {
        font-size: .7rem; font-weight: 700; letter-spacing: .1em;
        text-transform: uppercase; color: var(--bs-gray-500);
        padding-bottom: 6px; border-bottom: 1px solid var(--bs-gray-200);
        margin-bottom: 16px;
    }
    .info-row td { font-size: .82rem; padding: 7px 10px; }
    .info-row td:first-child { color: var(--bs-gray-600); width: 42%; font-weight: 600; }
    .timeline-item { position: relative; padding-left: 24px; padding-bottom: 20px; }
    .timeline-item::before {
        content: ''; position: absolute; left: 6px; top: 20px;
        bottom: 0; width: 2px; background: var(--bs-gray-200);
    }
    .timeline-item:last-child::before { display: none; }
    .timeline-dot {
        position: absolute; left: 0; top: 6px;
        width: 14px; height: 14px; border-radius: 50%;
        border: 2px solid white; box-shadow: 0 0 0 2px var(--bs-gray-300);
    }
    @keyframes pulse-red { 0%,100%{opacity:1} 50%{opacity:.5} }
    .badge-pulse { animation: pulse-red 1.8s ease-in-out infinite; }
</style>
@endsection

@section('content')
<div class="content d-flex flex-column flex-column-fluid" id="kt_content">
    @include('partials.toolbar')
    <div class="post d-flex flex-column-fluid" id="kt_post">
        <div id="kt_content_container" class="container-xxl">

            {{-- Flash ─────────────────────────────────────────────────────── --}}
            @foreach(['success','error','info'] as $type)
            @if(session($type))
            <div class="alert alert-{{ $type==='error'?'danger':$type }} d-flex align-items-center p-4 mb-5">
                <i class="bi bi-{{ $type==='error'?'x':'check' }}-circle fs-2 me-3"></i>
                <span>{{ session($type) }}</span>
            </div>
            @endif
            @endforeach

            {{-- Header ─────────────────────────────────────────────────────── --}}
            @php
                $stMap = [
                    'pending'   => ['badge-light-info',    'Pending',   'info'],
                    'due'       => ['badge-light-warning',  'Due',       'warning'],
                    'overdue'   => ['badge-light-danger',   'Overdue',   'danger'],
                    'completed' => ['badge-light-success',  'Completed', 'success'],
                ];
                [$stCls, $stLbl, $stColor] = $stMap[$schedule->status] ?? ['badge-light','?','secondary'];
                $daysLeft = now()->startOfDay()->diffInDays(\Carbon\Carbon::parse($schedule->next_maintenance)->startOfDay(), false);
            @endphp
            <div class="d-flex align-items-start justify-content-between mb-6">
                <div>
                    <div class="d-flex align-items-center gap-3 mb-1">
                        <h1 class="page-heading fw-bold fs-3 text-gray-900 my-0">
                            Jadwal PM — {{ $schedule->pm_cycle }}
                        </h1>
                        <span class="badge {{ $stCls }} fw-bold px-3 {{ $schedule->status==='overdue'?'badge-pulse':'' }}">
                            {{ $stLbl }}
                        </span>
                    </div>
                    <ul class="breadcrumb breadcrumb-separatorless fw-semibold fs-7 mt-1">
                        <li class="breadcrumb-item text-muted">
                            <a href="{{ route('admin.schedules.index') }}" class="text-muted text-hover-primary">Jadwal PM</a>
                        </li>
                        <li class="breadcrumb-item"><span class="bullet bg-gray-500 w-5px h-2px"></span></li>
                        <li class="breadcrumb-item text-muted">{{ $schedule->equipment_name }}</li>
                    </ul>
                </div>
                <div class="d-flex gap-2">
                    <a href="{{ route('admin.schedules.edit', $schedule->id) }}" class="btn btn-light-primary btn-sm">
                        <i class="bi bi-pencil me-1"></i>Edit
                    </a>
                    @if(in_array($schedule->status, ['due','overdue']))
                    <a href="{{ route('admin.records.create', ['schedule_id' => $schedule->id]) }}"
                       class="btn btn-danger btn-sm">
                        <i class="bi bi-play-fill me-1"></i>Mulai PM Sekarang
                    </a>
                    @endif
                    <a href="{{ route('admin.schedules.index') }}" class="btn btn-light btn-sm">
                        <i class="bi bi-arrow-left me-1"></i>Kembali
                    </a>
                </div>
            </div>

            {{-- Alert Due / Overdue ────────────────────────────────────────── --}}
            @if($schedule->status === 'overdue')
            <div class="alert alert-danger d-flex align-items-center p-4 mb-5">
                <i class="bi bi-exclamation-octagon fs-2 text-danger me-3 flex-shrink-0"></i>
                <div>
                    <div class="fw-bold">PM ini sudah terlambat {{ abs($daysLeft) }} hari!</div>
                    <div class="fs-8 mt-1">Harap segera lakukan pelaksanaan PM untuk equipment ini.</div>
                </div>
                <a href="{{ route('admin.records.create', ['schedule_id'=>$schedule->id]) }}"
                   class="btn btn-sm btn-danger ms-auto">
                    <i class="bi bi-play-fill me-1"></i>Mulai PM
                </a>
            </div>
            @elseif($schedule->status === 'due')
            <div class="alert alert-warning d-flex align-items-center p-4 mb-5">
                <i class="bi bi-clock-fill fs-2 text-warning me-3 flex-shrink-0"></i>
                <div>
                    <div class="fw-bold">PM jatuh tempo dalam {{ $daysLeft }} hari.</div>
                    <div class="fs-8 mt-1">Jadwalkan pelaksanaan PM secepatnya.</div>
                </div>
                <a href="{{ route('admin.records.create', ['schedule_id'=>$schedule->id]) }}"
                   class="btn btn-sm btn-warning ms-auto">
                    <i class="bi bi-play-fill me-1"></i>Mulai PM
                </a>
            </div>
            @endif

            <div class="row g-5">

                {{-- ── Kolom Kiri: Info Jadwal + Equipment ──────────────── --}}
                <div class="col-lg-4">

                    {{-- Info Jadwal --}}
                    <div class="card shadow-sm mb-5">
                        <div class="card-body p-6">
                            <div class="section-title">Informasi Jadwal</div>
                            <table class="table info-row mb-0">
                                <tbody>
                                    <tr>
                                        <td>PM Cycle</td>
                                        <td><span class="badge badge-light-primary fw-bold">{{ $schedule->pm_cycle }}</span></td>
                                    </tr>
                                    <tr>
                                        <td>Status</td>
                                        <td>
                                            <span class="badge {{ $stCls }} fw-bold">{{ $stLbl }}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Next PM</td>
                                        <td class="fw-semibold {{ $schedule->status==='overdue'?'text-danger':'' }}">
                                            {{ \Carbon\Carbon::parse($schedule->next_maintenance)->format('d M Y') }}
                                            <div class="text-muted fs-9">
                                                @if($daysLeft < 0)
                                                    <span class="text-danger">{{ abs($daysLeft) }} hari terlambat</span>
                                                @elseif($daysLeft === 0)
                                                    <span class="text-warning">Hari ini</span>
                                                @else
                                                    {{ $daysLeft }} hari lagi
                                                @endif
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Last PM</td>
                                        <td class="fw-semibold">
                                            {{ $schedule->last_maintenance
                                                ? \Carbon\Carbon::parse($schedule->last_maintenance)->format('d M Y')
                                                : '—' }}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Interval</td>
                                        <td class="fw-semibold">
                                            {{ $schedule->interval_days ? $schedule->interval_days.' hari' : '—' }}
                                            @if($schedule->interval_hours)
                                            <div class="text-muted fs-9">{{ $schedule->interval_hours }} jam operasi</div>
                                            @endif
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {{-- Info Equipment --}}
                    <div class="card shadow-sm mb-5">
                        <div class="card-body p-6">
                            <div class="section-title">Equipment</div>
                            <div class="d-flex align-items-center gap-3 mb-4">
                                <div class="symbol symbol-45px">
                                    <span class="symbol-label bg-light-primary">
                                        <i class="bi bi-cpu fs-3 text-primary"></i>
                                    </span>
                                </div>
                                <div>
                                    <div class="fw-bold text-gray-900 fs-6">{{ $schedule->equipment_name }}</div>
                                    <div class="text-muted fs-8">{{ $schedule->equipment_code }}</div>
                                </div>
                            </div>
                            <table class="table info-row mb-0">
                                <tbody>
                                    <tr><td>ETM Group</td><td><span class="badge badge-light-info fw-bold">{{ $schedule->etm_group ?? '—' }}</span></td></tr>
                                    <tr><td>Lokasi</td><td class="fw-semibold">{{ $schedule->location ?? '—' }}</td></tr>
                                    <tr>
                                        <td>Status Unit</td>
                                        <td>
                                            @if($schedule->equipment_status === 'active')
                                                <span class="text-success fw-bold"><i class="bi bi-circle-fill me-1" style="font-size:.5rem"></i>Aktif</span>
                                            @elseif($schedule->equipment_status === 'maintenance')
                                                <span class="text-warning fw-bold"><i class="bi bi-circle-fill me-1" style="font-size:.5rem"></i>Maintenance</span>
                                            @else
                                                <span class="text-danger fw-bold"><i class="bi bi-circle-fill me-1" style="font-size:.5rem"></i>Inactive</span>
                                            @endif
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <div class="mt-3">
                                <a href="{{ route('admin.equipment.show', $schedule->equipment_id) }}"
                                   class="btn btn-sm btn-light-primary w-100">
                                    <i class="bi bi-eye me-1"></i>Lihat Detail Equipment
                                </a>
                            </div>
                        </div>
                    </div>

                    {{-- Template check sheet --}}
                    @if($templates->count())
                    <div class="card shadow-sm">
                        <div class="card-body p-6">
                            <div class="section-title">Template Check Sheet</div>
                            @foreach($templates as $t)
                            <div class="d-flex align-items-center justify-content-between py-2
                                        {{ !$loop->last ? 'border-bottom border-dashed' : '' }}">
                                <div>
                                    <div class="fw-semibold fs-7">{{ $t->template_name }}</div>
                                    <div class="text-muted fs-9">{{ $t->doc_number }}</div>
                                </div>
                                <span class="badge badge-light-success fw-bold fs-9">Aktif</span>
                            </div>
                            @endforeach
                        </div>
                    </div>
                    @else
                    <div class="card shadow-sm border border-warning border-dashed">
                        <div class="card-body p-5 text-center">
                            <i class="bi bi-exclamation-triangle text-warning fs-2x d-block mb-2"></i>
                            <div class="fw-bold text-warning fs-7">Belum ada template check sheet</div>
                            <div class="text-muted fs-8 mt-1">Template diperlukan sebelum dapat melakukan PM.</div>
                        </div>
                    </div>
                    @endif

                </div>

                {{-- ── Kolom Kanan: Riwayat Record ──────────────────────── --}}
                <div class="col-lg-8">
                    <div class="card shadow-sm">
                        <div class="card-header border-0 pt-6">
                            <div class="card-title">
                                <h4 class="fw-bold text-gray-800 mb-0">
                                    <i class="bi bi-clock-history me-2 text-primary"></i>
                                    Riwayat Maintenance Record
                                </h4>
                            </div>
                            <div class="card-toolbar">
                                <span class="badge badge-light-primary fw-bold">
                                    {{ $records->count() }} record
                                </span>
                            </div>
                        </div>
                        <div class="card-body pt-3">
                            @if($records->isEmpty())
                            <div class="text-center py-10">
                                <i class="bi bi-calendar-x fs-2x text-gray-300 d-block mb-2"></i>
                                <div class="text-muted fs-7">Belum ada maintenance record untuk jadwal ini.</div>
                                @if(in_array($schedule->status, ['due','overdue']))
                                <a href="{{ route('admin.records.create', ['schedule_id'=>$schedule->id]) }}"
                                   class="btn btn-sm btn-primary mt-3">
                                    <i class="bi bi-play-fill me-1"></i>Mulai PM Pertama
                                </a>
                                @endif
                            </div>
                            @else
                            <div class="table-responsive">
                                <table class="table table-row-bordered gy-4 gs-7 align-middle">
                                    <thead>
                                        <tr class="fw-bold text-muted fs-7 text-uppercase">
                                            <th>No. Record</th>
                                            <th>Tanggal</th>
                                            <th>Teknisi</th>
                                            <th>Durasi</th>
                                            <th>Status</th>
                                            <th class="text-end">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach($records as $r)
                                        @php
                                            $rStMap = [
                                                'in_progress' => ['badge-light-warning', 'In Progress'],
                                                'completed'   => ['badge-light-info',    'Selesai'],
                                                'validated'   => ['badge-light-success', 'Validated'],
                                                'rejected'    => ['badge-light-danger',  'Rejected'],
                                            ];
                                            [$rCls,$rLbl] = $rStMap[$r->status] ?? ['badge-light',$r->status];

                                            $durMin = null;
                                            if ($r->start_time && $r->end_time) {
                                                $start  = \Carbon\Carbon::parse($r->maintenance_date.' '.$r->start_time);
                                                $end    = \Carbon\Carbon::parse($r->maintenance_date.' '.$r->end_time);
                                                $durMin = $start->diffInMinutes($end);
                                            }
                                        @endphp
                                        <tr>
                                            <td>
                                                <a href="{{ route('admin.records.show', $r->id) }}"
                                                   class="fw-bold text-primary">{{ $r->record_number }}</a>
                                                <div class="text-muted fs-9">{{ $r->pm_cycle ?? '' }}</div>
                                            </td>
                                            <td class="text-muted fs-7">
                                                {{ \Carbon\Carbon::parse($r->maintenance_date)->format('d M Y') }}
                                                <div class="fs-9">{{ $r->start_time ?? '' }}</div>
                                            </td>
                                            <td class="text-muted fs-7">{{ $r->technician_name }}</td>
                                            <td class="fs-7">
                                                @if($durMin !== null)
                                                <span class="badge badge-light-success fw-semibold">
                                                    {{ $durMin >= 60 ? intdiv($durMin,60).'j '.($durMin%60 > 0 ? $durMin%60 .'mnt':'') : $durMin.' mnt' }}
                                                </span>
                                                @elseif($r->status === 'in_progress')
                                                <span class="badge badge-light-warning">Running...</span>
                                                @else
                                                <span class="text-muted">—</span>
                                                @endif
                                            </td>
                                            <td>
                                                <span class="badge {{ $rCls }} fw-semibold px-3 py-2">{{ $rLbl }}</span>
                                            </td>
                                            <td class="text-end">
                                                <a href="{{ route('admin.records.show', $r->id) }}"
                                                   class="btn btn-sm btn-icon btn-light-primary"
                                                   data-bs-toggle="tooltip" title="Lihat Detail">
                                                    <i class="bi bi-eye"></i>
                                                </a>
                                            </td>
                                        </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                            @endif
                        </div>
                    </div>
                </div>

            </div><!-- /row -->

        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
KTUtil.onDOMContentLoaded(function () {
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
});
</script>
@endpush