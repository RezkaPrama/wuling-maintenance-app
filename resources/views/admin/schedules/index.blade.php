{{-- resources/views/admin/maintenance/schedule/index.blade.php --}}
@extends('layouts.app')

@section('title', 'Jadwal PM')

@push('styles')
<style>
/* ── Kalender ── */
.pm-calendar { border-collapse: separate; border-spacing: 4px; width: 100%; }
.pm-calendar th { background: #f5f8fa; font-size: 0.75rem; font-weight: 600;
    text-transform: uppercase; letter-spacing: .05em; color: #7e8299;
    padding: 6px 4px; text-align: center; border-radius: 4px; }
.pm-calendar td { vertical-align: top; min-height: 90px; height: 90px;
    width: 14.28%; padding: 4px; background: #fff;
    border: 1px solid #eff2f5; border-radius: 6px; position: relative; }
.pm-calendar td.today { background: #f0f3ff; border-color: #6366f1; }
.pm-calendar td.other-month { background: #fafafa; opacity: .6; }
.cal-day-num { font-size: 0.75rem; font-weight: 600; color: #5e6278;
    position: absolute; top: 4px; right: 6px; }
.cal-day-num.today-num { color: #6366f1; }
.cal-event { font-size: 0.68rem; border-radius: 3px; padding: 1px 4px;
    margin-top: 2px; cursor: pointer; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis; display: block; }
.cal-event.pending  { background: #e8f4fd; color: #0095e8; }
.cal-event.due      { background: #fff4de; color: #f6a723; }
.cal-event.overdue  { background: #ffeef3; color: #d9214e; }
.cal-event.completed{ background: #e8fff3; color: #50cd89; }

/* Badge status */
.badge-pending   { background: #e8f4fd; color: #0095e8; }
.badge-due       { background: #fff4de; color: #f6a723; }
.badge-overdue   { background: #ffeef3; color: #d9214e; }
.badge-completed { background: #e8fff3; color: #50cd89; }

/* Tooltip hover kalender */
.cal-event-tooltip { display: none; position: absolute; z-index: 999;
    background: #1e1e2d; color: #fff; border-radius: 6px;
    padding: 8px 12px; font-size: 0.75rem; width: 180px;
    left: 50%; transform: translateX(-50%); top: 100%; margin-top: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,.25); }
.pm-calendar td:hover .cal-event-tooltip { display: block; }
</style>
@endpush

@section('content')
{{-- ── PAGE HEADER ── --}}
<div class="d-flex align-items-center justify-content-between mb-6">
    <div>
        <h1 class="fs-2 fw-bold text-gray-900 mb-1">Jadwal Preventive Maintenance</h1>
        <span class="text-muted fs-6">Kelola dan pantau jadwal PM seluruh equipment</span>
    </div>
    <div class="d-flex gap-2">
        {{-- Navigasi bulan kalender --}}
        @php
            $prevMonth = \Carbon\Carbon::parse($filterMonth . '-01')->subMonth()->format('Y-m');
            $nextMonth = \Carbon\Carbon::parse($filterMonth . '-01')->addMonth()->format('Y-m');
        @endphp
        <a href="{{ request()->fullUrlWithQuery(['filter_month' => $prevMonth]) }}"
           class="btn btn-sm btn-light-primary">
            <i class="bi bi-chevron-left"></i>
        </a>
        <span class="btn btn-sm btn-primary pe-none">
            {{ \Carbon\Carbon::parse($filterMonth . '-01')->translatedFormat('F Y') }}
        </span>
        <a href="{{ request()->fullUrlWithQuery(['filter_month' => $nextMonth]) }}"
           class="btn btn-sm btn-light-primary">
            <i class="bi bi-chevron-right"></i>
        </a>
    </div>
</div>

{{-- ── STAT CARDS ── --}}
<div class="row g-4 mb-6">
    @php
        $statCards = [
            ['label' => 'Total Jadwal', 'value' => $stats->total ?? 0,     'icon' => 'bi-calendar3',         'color' => 'primary'],
            ['label' => 'Bulan Ini',    'value' => $scheduleThisMonth,      'icon' => 'bi-calendar-check',    'color' => 'info'],
            ['label' => 'Due',          'value' => $stats->due ?? 0,        'icon' => 'bi-exclamation-circle','color' => 'warning'],
            ['label' => 'Overdue',      'value' => $stats->overdue ?? 0,    'icon' => 'bi-x-circle',          'color' => 'danger'],
            ['label' => 'Completed',    'value' => $stats->completed ?? 0,  'icon' => 'bi-check-circle',      'color' => 'success'],
        ];
    @endphp
    @foreach($statCards as $card)
    <div class="col-6 col-lg">
        <div class="card card-flush h-100 border-0 shadow-sm">
            <div class="card-body d-flex align-items-center gap-4 p-5">
                <div class="symbol symbol-50px">
                    <div class="symbol-label bg-light-{{ $card['color'] }}">
                        <i class="bi {{ $card['icon'] }} fs-2 text-{{ $card['color'] }}"></i>
                    </div>
                </div>
                <div>
                    <div class="fs-2 fw-bold text-gray-900">{{ number_format($card['value']) }}</div>
                    <div class="fs-7 text-muted">{{ $card['label'] }}</div>
                </div>
            </div>
        </div>
    </div>
    @endforeach
</div>

{{-- ── KALENDER ── --}}
<div class="card card-flush border-0 shadow-sm mb-6">
    <div class="card-header border-0 pt-6">
        <div class="card-title">
            <h3 class="fw-bold fs-4 mb-0">
                <i class="bi bi-calendar3 me-2 text-primary"></i>
                Kalender PM —
                {{ \Carbon\Carbon::parse($filterMonth . '-01')->translatedFormat('F Y') }}
            </h3>
        </div>
        <div class="card-toolbar gap-2">
            <span class="badge badge-light-info">
                <i class="bi bi-circle-fill me-1" style="font-size:.5rem"></i>Pending
            </span>
            <span class="badge badge-light-warning">
                <i class="bi bi-circle-fill me-1" style="font-size:.5rem"></i>Due
            </span>
            <span class="badge badge-light-danger">
                <i class="bi bi-circle-fill me-1" style="font-size:.5rem"></i>Overdue
            </span>
            <span class="badge badge-light-success">
                <i class="bi bi-circle-fill me-1" style="font-size:.5rem"></i>Completed
            </span>
        </div>
    </div>
    <div class="card-body pt-0 px-6 pb-6">
        @php
            $firstDay = \Carbon\Carbon::parse($filterMonth . '-01');
            $daysInMonth = $firstDay->daysInMonth;
            $startDow = $firstDay->dayOfWeek; // 0=Sun
            $today = now()->day;
            $isCurrentMonth = ($filterMonth === now()->format('Y-m'));
            $dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        @endphp
        <table class="pm-calendar">
            <thead>
                <tr>
                    @foreach($dayNames as $d)
                        <th>{{ $d }}</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @php
                    $cellIndex = 0;
                    $dayNum = 1;
                @endphp
                <tr>
                    {{-- Leading empty cells --}}
                    @for ($e = 0; $e < $startDow; $e++)
                        <td class="other-month"></td>
                        @php $cellIndex++ @endphp
                    @endfor

                    {{-- Days of month --}}
                    @while ($dayNum <= $daysInMonth)
                        @if ($cellIndex > 0 && $cellIndex % 7 === 0)
                            </tr><tr>
                        @endif
                        @php
                            $isToday = $isCurrentMonth && $dayNum === $today;
                            $events  = $calendarData[$dayNum] ?? [];
                        @endphp
                        <td class="{{ $isToday ? 'today' : '' }}">
                            <span class="cal-day-num {{ $isToday ? 'today-num' : '' }}">{{ $dayNum }}</span>
                            <div style="margin-top: 18px;">
                                @foreach($events as $ev)
                                    <a href="{{ route('admin.schedules.show', $ev->id) }}"
                                       class="cal-event {{ $ev->status }}"
                                       title="{{ $ev->equipment_name }} ({{ $ev->pm_cycle }})">
                                        {{ Str::limit($ev->equipment_code, 12) }}
                                    </a>
                                @endforeach
                                @if(count($events) === 0 && $isToday)
                                    <div class="text-center mt-2">
                                        <i class="bi bi-check2 text-success opacity-50" style="font-size:.8rem"></i>
                                    </div>
                                @endif
                            </div>
                        </td>
                        @php $cellIndex++; $dayNum++; @endphp
                    @endwhile

                    {{-- Trailing empty cells --}}
                    @while ($cellIndex % 7 !== 0)
                        <td class="other-month"></td>
                        @php $cellIndex++ @endphp
                    @endwhile
                </tr>
            </tbody>
        </table>
    </div>
</div>

{{-- ── FILTER + TABEL LIST ── --}}
<div class="card card-flush border-0 shadow-sm">
    <div class="card-header border-0 pt-6">
        <div class="card-title">
            <h3 class="fw-bold fs-4 mb-0">
                <i class="bi bi-list-check me-2 text-primary"></i>
                Daftar Jadwal PM
            </h3>
        </div>
        <div class="card-toolbar">
            {{-- Filter form --}}
            <form method="GET" class="d-flex flex-wrap gap-2 align-items-center">
                <input type="hidden" name="filter_month" value="{{ $filterMonth }}">
                {{-- Status --}}
                <select name="filter_status" class="form-select form-select-sm w-auto"
                    onchange="this.form.submit()">
                    <option value="all" @selected(!$filterStatus || $filterStatus==='all')>Semua Status</option>
                    <option value="pending"   @selected($filterStatus==='pending')>Pending</option>
                    <option value="due"       @selected($filterStatus==='due')>Due</option>
                    <option value="overdue"   @selected($filterStatus==='overdue')>Overdue</option>
                    <option value="completed" @selected($filterStatus==='completed')>Completed</option>
                </select>
                {{-- PM Cycle --}}
                <select name="filter_cycle" class="form-select form-select-sm w-auto"
                    onchange="this.form.submit()">
                    <option value="all" @selected(!$filterCycle || $filterCycle==='all')>Semua Cycle</option>
                    <option value="6M" @selected($filterCycle==='6M')>6 Bulan</option>
                    <option value="1Y" @selected($filterCycle==='1Y')>1 Tahun</option>
                    <option value="2Y" @selected($filterCycle==='2Y')>2 Tahun</option>
                </select>
                {{-- ETM Group --}}
                <select name="filter_group" class="form-select form-select-sm w-auto"
                    onchange="this.form.submit()">
                    <option value="">Semua Group</option>
                    @foreach($etmGroups as $g)
                        <option value="{{ $g }}" @selected($filterGroup === $g)>{{ $g }}</option>
                    @endforeach
                </select>
                @if($filterStatus || $filterCycle || $filterGroup)
                    <a href="{{ route('admin.schedules.index') }}"
                       class="btn btn-sm btn-light-danger">
                        <i class="bi bi-x-circle me-1"></i>Reset
                    </a>
                @endif
            </form>
        </div>
    </div>

    <div class="card-body pt-0">
        @if($schedules->isEmpty())
            <div class="text-center py-10">
                <i class="bi bi-calendar-x fs-1 text-muted mb-3 d-block"></i>
                <p class="text-muted">Tidak ada jadwal yang ditemukan.</p>
            </div>
        @else
        <div class="table-responsive">
            <table class="table table-row-dashed table-row-gray-200 align-middle gs-0 gy-3">
                <thead>
                    <tr class="fw-bold text-muted fs-7 text-uppercase">
                        <th class="ps-4">Equipment</th>
                        <th>PM Cycle</th>
                        <th>Last PM</th>
                        <th>Next PM</th>
                        <th>Status</th>
                        <th class="text-center">Interval</th>
                        <th class="text-end pe-4">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($schedules as $s)
                    @php
                        $daysLeft = now()->diffInDays($s->next_maintenance, false);
                        $isLate   = $daysLeft < 0;
                    @endphp
                    <tr>
                        <td class="ps-4">
                            <div class="d-flex align-items-center gap-3">
                                <div class="symbol symbol-35px">
                                    <div class="symbol-label
                                        {{ $s->equipment_status === 'active' ? 'bg-light-success' : 'bg-light-warning' }}">
                                        <i class="bi bi-cpu fs-5
                                            {{ $s->equipment_status === 'active' ? 'text-success' : 'text-warning' }}"></i>
                                    </div>
                                </div>
                                <div>
                                    <a href="{{ route('admin.equipment.show', $s->equipment_id) }}"
                                       class="fw-bold text-gray-800 text-hover-primary d-block">
                                        {{ $s->equipment_name }}
                                    </a>
                                    <span class="text-muted fs-8">{{ $s->equipment_code }}
                                        @if($s->etm_group)
                                            · {{ $s->etm_group }}
                                        @endif
                                    </span>
                                </div>
                            </div>
                        </td>
                        <td>
                            <span class="badge badge-light-primary fw-semibold">
                                {{ $s->pm_cycle }}
                            </span>
                        </td>
                        <td class="text-muted fs-7">
                            {{ $s->last_maintenance
                                ? \Carbon\Carbon::parse($s->last_maintenance)->format('d M Y')
                                : '—' }}
                        </td>
                        <td>
                            <div class="fw-semibold {{ $isLate ? 'text-danger' : 'text-gray-800' }}">
                                {{ \Carbon\Carbon::parse($s->next_maintenance)->format('d M Y') }}
                            </div>
                            <div class="fs-8 {{ $isLate ? 'text-danger' : 'text-muted' }}">
                                @if($isLate)
                                    <i class="bi bi-exclamation-triangle-fill me-1"></i>
                                    {{ abs($daysLeft) }} hari terlambat
                                @elseif($daysLeft === 0)
                                    <i class="bi bi-clock-fill me-1 text-warning"></i>
                                    Hari ini
                                @else
                                    {{ $daysLeft }} hari lagi
                                @endif
                            </div>
                        </td>
                        <td>
                            @php
                                $statusMap = [
                                    'pending'   => ['class' => 'badge-light-info',    'label' => 'Pending'],
                                    'due'       => ['class' => 'badge-light-warning', 'label' => 'Due'],
                                    'overdue'   => ['class' => 'badge-light-danger',  'label' => 'Overdue'],
                                    'completed' => ['class' => 'badge-light-success', 'label' => 'Completed'],
                                ];
                                $st = $statusMap[$s->status] ?? ['class' => 'badge-light', 'label' => $s->status];
                            @endphp
                            <span class="badge {{ $st['class'] }} fw-semibold px-3 py-2">
                                {{ $st['label'] }}
                            </span>
                        </td>
                        <td class="text-center text-muted fs-7">
                            {{ $s->interval_days ? $s->interval_days . ' hari' : '—' }}
                        </td>
                        <td class="text-end pe-4">
                            <div class="d-flex justify-content-end gap-2">
                                <a href="{{ route('admin.schedules.show', $s->id) }}"
                                   class="btn btn-sm btn-light-primary">
                                    <i class="bi bi-eye me-1"></i>Detail
                                </a>
                                @if(in_array($s->status, ['due', 'overdue']))
                                <a href="{{ route('admin.records.create', ['schedule_id' => $s->id]) }}"
                                   class="btn btn-sm btn-danger">
                                    <i class="bi bi-play-fill me-1"></i>Mulai PM
                                </a>
                                @endif
                            </div>
                        </td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        {{-- Pagination --}}
        <div class="d-flex justify-content-between align-items-center mt-4">
            <div class="text-muted fs-7">
                Menampilkan {{ $schedules->firstItem() }}–{{ $schedules->lastItem() }}
                dari {{ $schedules->total() }} jadwal
            </div>
            {{ $schedules->links() }}
        </div>
        @endif
    </div>
</div>
@endsection