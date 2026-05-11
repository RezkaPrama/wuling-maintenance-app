@extends('layouts.app')

@section('subtitle')
    Detail Equipment — {{ $equipment->equipment_name }}
@endsection

@section('styles')
<style>
    .spec-item {
        border-left: 3px solid #009EF7;
        padding-left: 12px;
        margin-bottom: 12px;
    }
    .timeline-item { position: relative; padding-left: 28px; margin-bottom: 20px; }
    .timeline-item::before {
        content: '';
        position: absolute;
        left: 8px; top: 0; bottom: -20px;
        width: 2px;
        background: var(--bs-border-color);
    }
    .timeline-item:last-child::before { display: none; }
    .timeline-dot {
        position: absolute;
        left: 0; top: 4px;
        width: 18px; height: 18px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
    }
    .history-row { cursor: pointer; transition: background 0.15s; }
    .history-row:hover { filter: brightness(0.97); }
    @keyframes pulse-red { 0%,100%{opacity:1} 50%{opacity:0.5} }
    .badge-pulse { animation: pulse-red 1.8s ease-in-out infinite; }
</style>
@endsection

@section('content')
<div class="content d-flex flex-column flex-column-fluid" id="kt_content">

    @include('partials.toolbar')

    <div class="post d-flex flex-column-fluid" id="kt_post">
        <div id="kt_content_container" class="container-xxl">

            {{-- Breadcrumb back --}}
            <div class="mb-5">
                <a href="{{ route('admin.equipment.index') }}" class="btn btn-sm btn-light">
                    <i class="bi bi-arrow-left me-1"></i>Kembali ke Daftar Equipment
                </a>
            </div>

            {{-- ═══════════════════════════════════════════════
                 HEADER CARD — Info utama equipment
            ════════════════════════════════════════════════ --}}
            <div class="card shadow-sm mb-6">
                <div class="card-body pt-8 pb-0">
                    <div class="d-flex flex-wrap flex-sm-nowrap">

                        {{-- Icon Equipment --}}
                        <div class="me-7 mb-4">
                            <div class="symbol symbol-100px symbol-lg-120px symbol-fixed">
                                <span class="symbol-label
                                    @if($equipment->status == 'active') bg-light-success
                                    @elseif($equipment->status == 'maintenance') bg-light-warning
                                    @else bg-light-danger
                                    @endif">
                                    <i class="bi bi-cpu-fill fs-4x
                                        @if($equipment->status == 'active') text-success
                                        @elseif($equipment->status == 'maintenance') text-warning
                                        @else text-danger
                                        @endif"></i>
                                </span>
                                {{-- Status dot --}}
                                <div class="position-absolute translate-middle start-100 top-100 border border-4 border-white rounded-circle h-15px w-15px ms-n3 mt-n3
                                    @if($equipment->status == 'active') bg-success
                                    @elseif($equipment->status == 'maintenance') bg-warning
                                    @else bg-danger
                                    @endif">
                                </div>
                            </div>
                        </div>

                        {{-- Info & Stat --}}
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-start flex-wrap mb-2">
                                <div>
                                    <div class="d-flex align-items-center mb-2">
                                        <h2 class="text-gray-900 fw-bolder me-3 mb-0">{{ $equipment->equipment_name }}</h2>
                                        <span class="badge
                                            @if($equipment->status == 'active') badge-light-success
                                            @elseif($equipment->status == 'maintenance') badge-light-warning
                                            @else badge-light-danger
                                            @endif fw-bolder fs-8 px-3 py-2 text-uppercase">
                                            {{ $equipment->status }}
                                        </span>
                                    </div>
                                    <div class="d-flex flex-wrap gap-4 fw-bold fs-7 text-gray-400">
                                        <span><i class="bi bi-hash me-1"></i>{{ $equipment->equipment_code }}</span>
                                        <span><i class="bi bi-file-text me-1"></i>PM: {{ $equipment->pm_number }}</span>
                                        @if($equipment->tis_number)
                                        <span><i class="bi bi-upc me-1"></i>TIS: {{ $equipment->tis_number }}</span>
                                        @endif
                                        <span><i class="bi bi-diagram-3 me-1"></i>{{ $equipment->etm_group }}</span>
                                        @if($equipment->location)
                                        <span><i class="bi bi-geo-alt me-1"></i>{{ $equipment->location }}</span>
                                        @endif
                                    </div>
                                </div>
                            </div>

                            <div class="separator separator-dashed my-5"></div>

                            {{-- Mini stat bar --}}
                            <div class="d-flex flex-wrap gap-6 mb-4">
                                <div class="border border-dashed rounded px-4 py-3">
                                    <div class="fw-bolder fs-3 text-gray-800"
                                         data-kt-countup="true"
                                         data-kt-countup-value="{{ $totalPMAll }}">0</div>
                                    <div class="text-muted fs-8 fw-bold">Total PM Record</div>
                                </div>
                                <div class="border border-dashed rounded px-4 py-3">
                                    <div class="fw-bolder fs-3 text-success"
                                         data-kt-countup="true"
                                         data-kt-countup-value="{{ $totalPMDone }}">0</div>
                                    <div class="text-muted fs-8 fw-bold">PM Selesai</div>
                                </div>
                                <div class="border border-dashed rounded px-4 py-3">
                                    <div class="fw-bolder fs-3 text-primary">
                                        {{ $lastRecord
                                            ? \Carbon\Carbon::parse($lastRecord->maintenance_date)->format('d M Y')
                                            : '-' }}
                                    </div>
                                    <div class="text-muted fs-8 fw-bold">PM Terakhir</div>
                                </div>
                                <div class="border border-dashed rounded px-4 py-3">
                                    <div class="fw-bolder fs-3 text-gray-800">
                                        {{ $schedules->count() }}
                                    </div>
                                    <div class="text-muted fs-8 fw-bold">Total Schedule</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {{-- Tabs --}}
                    <ul class="nav nav-stretch nav-line-tabs nav-line-tabs-2x border-transparent fs-5 fw-bolder">
                        <li class="nav-item">
                            <a class="nav-link text-active-primary pb-4 active" data-bs-toggle="tab" href="#tab_info">
                                <i class="bi bi-info-circle me-1"></i>Informasi
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-active-primary pb-4" data-bs-toggle="tab" href="#tab_schedule">
                                <i class="bi bi-calendar3 me-1"></i>Jadwal PM
                                <span class="badge badge-light-primary ms-2">{{ $schedules->count() }}</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-active-primary pb-4" data-bs-toggle="tab" href="#tab_history">
                                <i class="bi bi-clock-history me-1"></i>Riwayat Maintenance
                                <span class="badge badge-light-secondary ms-2">{{ $totalPMAll }}</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-active-primary pb-4" data-bs-toggle="tab" href="#tab_chart">
                                <i class="bi bi-bar-chart me-1"></i>Statistik
                            </a>
                        </li>
                    </ul>
                </div>
            </div>{{-- /header card --}}

            {{-- ═══════════════════════════════════════════════
                 TAB CONTENT
            ════════════════════════════════════════════════ --}}
            <div class="tab-content">

                {{-- ── TAB 1: INFORMASI ── --}}
                <div class="tab-pane fade show active" id="tab_info">
                    <div class="row g-5">

                        {{-- Spesifikasi --}}
                        <div class="col-xl-6">
                            <div class="card shadow-sm h-100">
                                <div class="card-header border-0 pt-5">
                                    <h4 class="card-title fw-bolder text-gray-800">
                                        <i class="bi bi-list-check text-primary me-2"></i>Spesifikasi Teknis
                                    </h4>
                                </div>
                                <div class="card-body pt-2">
                                    @if(count($specifications) > 0)
                                        @foreach($specifications as $key => $val)
                                        <div class="spec-item">
                                            <div class="text-muted fs-8 fw-bold text-uppercase">{{ $key }}</div>
                                            <div class="fw-bolder text-gray-800">{{ $val ?: '-' }}</div>
                                        </div>
                                        @endforeach
                                    @else
                                        <div class="text-center text-muted py-8">
                                            <i class="bi bi-file-earmark-text fs-2x mb-3 d-block"></i>
                                            Spesifikasi belum diisi
                                        </div>
                                    @endif
                                </div>
                            </div>
                        </div>

                        {{-- Info dasar --}}
                        <div class="col-xl-6">
                            <div class="card shadow-sm h-100">
                                <div class="card-header border-0 pt-5">
                                    <h4 class="card-title fw-bolder text-gray-800">
                                        <i class="bi bi-card-list text-primary me-2"></i>Data Equipment
                                    </h4>
                                </div>
                                <div class="card-body pt-2">
                                    <table class="table table-row-dashed gy-3">
                                        <tbody>
                                            <tr>
                                                <td class="text-muted fw-bold w-150px">Kode Equipment</td>
                                                <td class="fw-bolder">{{ $equipment->equipment_code }}</td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted fw-bold">Nama Equipment</td>
                                                <td class="fw-bolder">{{ $equipment->equipment_name }}</td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted fw-bold">PM Number</td>
                                                <td class="fw-bolder">{{ $equipment->pm_number }}</td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted fw-bold">TIS Number</td>
                                                <td>{{ $equipment->tis_number ?: '-' }}</td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted fw-bold">ETM Group</td>
                                                <td>
                                                    <span class="badge badge-light-info fw-bold">
                                                        {{ $equipment->etm_group }}
                                                    </span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted fw-bold">Lokasi</td>
                                                <td>{{ $equipment->location ?: '-' }}</td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted fw-bold">Status Unit</td>
                                                <td>
                                                    <span class="badge
                                                        @if($equipment->status == 'active') badge-light-success
                                                        @elseif($equipment->status == 'maintenance') badge-light-warning
                                                        @else badge-light-danger
                                                        @endif fw-bold text-uppercase">
                                                        {{ $equipment->status }}
                                                    </span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>{{-- /tab_info --}}

                {{-- ── TAB 2: JADWAL PM ── --}}
                <div class="tab-pane fade" id="tab_schedule">
                    <div class="card shadow-sm">
                        <div class="card-header border-0 pt-5">
                            <h4 class="card-title fw-bolder text-gray-800">
                                <i class="bi bi-calendar-event text-primary me-2"></i>Jadwal Preventive Maintenance
                            </h4>
                        </div>
                        <div class="card-body pt-0">
                            <div class="table-responsive">
                                <table class="table table-row-bordered gy-4 gs-7">
                                    <thead>
                                        <tr class="text-gray-600 fw-bolder fs-7 text-uppercase">
                                            <th class="text-center">No</th>
                                            <th>PM Cycle</th>
                                            <th class="text-center">PM Terakhir</th>
                                            <th class="text-center">Jadwal Berikutnya</th>
                                            <th class="text-center">Status</th>
                                            <th class="text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody class="fw-bold text-gray-600">
                                        @forelse($schedules as $i => $sch)
                                        <tr>
                                            <td class="text-center">{{ $i + 1 }}</td>
                                            <td>
                                                <span class="badge
                                                    @if($sch->pm_cycle == '6M') badge-light-primary
                                                    @elseif($sch->pm_cycle == '1Y') badge-light-success
                                                    @else badge-light-warning
                                                    @endif fw-bold fs-7">
                                                    {{ $sch->pm_cycle }}
                                                </span>
                                            </td>
                                            <td class="text-center text-muted">
                                                {{ $sch->last_maintenance
                                                    ? \Carbon\Carbon::parse($sch->last_maintenance)->format('d M Y')
                                                    : 'Belum ada' }}
                                            </td>
                                            <td class="text-center fw-bolder
                                                @if($sch->status == 'overdue') text-danger
                                                @elseif($sch->status == 'due') text-warning
                                                @else text-gray-800
                                                @endif">
                                                {{ \Carbon\Carbon::parse($sch->next_maintenance)->format('d M Y') }}
                                                @if($sch->status == 'overdue')
                                                    <div class="text-danger fs-8 fw-bold">
                                                        ({{ \Carbon\Carbon::parse($sch->next_maintenance)->diffForHumans() }})
                                                    </div>
                                                @endif
                                            </td>
                                            <td class="text-center">
                                                @if($sch->status == 'overdue')
                                                    <span class="badge badge-danger badge-pulse fw-bold px-3">Overdue</span>
                                                @elseif($sch->status == 'due')
                                                    <span class="badge badge-warning fw-bold px-3">Due</span>
                                                @elseif($sch->status == 'completed')
                                                    <span class="badge badge-success fw-bold px-3">Selesai</span>
                                                @else
                                                    <span class="badge badge-light-secondary fw-bold px-3">Pending</span>
                                                @endif
                                            </td>
                                            <td class="text-center">
                                                @if(in_array($sch->status, ['due','overdue']))
                                                <a href="{{ route('admin.records.create', ['schedule_id' => $sch->id]) }}"
                                                   class="btn btn-sm btn-primary py-1 px-3">
                                                    <i class="bi bi-play-circle me-1"></i>Mulai PM
                                                </a>
                                                @else
                                                <span class="text-muted fs-8">Belum waktunya</span>
                                                @endif
                                            </td>
                                        </tr>
                                        @empty
                                        <tr>
                                            <td colspan="6" class="text-center text-muted py-8">
                                                Belum ada jadwal PM untuk equipment ini
                                            </td>
                                        </tr>
                                        @endforelse
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>{{-- /tab_schedule --}}

                {{-- ── TAB 3: RIWAYAT MAINTENANCE ── --}}
                <div class="tab-pane fade" id="tab_history">
                    <div class="card shadow-sm">
                        <div class="card-header border-0 pt-5">
                            <h4 class="card-title fw-bolder text-gray-800">
                                <i class="bi bi-clock-history text-primary me-2"></i>Riwayat Maintenance
                            </h4>
                        </div>

                        {{-- Filter riwayat --}}
                        <div class="card-body pt-3 pb-3 border-bottom">
                            <form method="GET" action="{{ route('admin.equipment.show', $equipment->id) }}#tab_history"
                                  id="historyFilterForm">
                                <div class="row g-3 align-items-end">
                                    <div class="col-lg-3">
                                        <label class="form-label fw-bold fs-7 mb-1">Tahun</label>
                                        <select name="filter_year" class="form-select form-select-solid"
                                                onchange="this.form.submit()">
                                            <option value="">Semua Tahun</option>
                                            @foreach($availableYears as $yr)
                                            <option value="{{ $yr }}" {{ $filterYear == $yr ? 'selected' : '' }}>
                                                {{ $yr }}
                                            </option>
                                            @endforeach
                                        </select>
                                    </div>
                                    <div class="col-lg-3">
                                        <label class="form-label fw-bold fs-7 mb-1">Status</label>
                                        <select name="filter_status" class="form-select form-select-solid"
                                                onchange="this.form.submit()">
                                            <option value="all">Semua Status</option>
                                            <option value="in_progress"  {{ $filterStatus == 'in_progress'  ? 'selected' : '' }}>In Progress</option>
                                            <option value="completed"    {{ $filterStatus == 'completed'    ? 'selected' : '' }}>Completed</option>
                                            <option value="validated"    {{ $filterStatus == 'validated'    ? 'selected' : '' }}>Validated</option>
                                            <option value="rejected"     {{ $filterStatus == 'rejected'     ? 'selected' : '' }}>Rejected</option>
                                        </select>
                                    </div>
                                    <div class="col-lg-2">
                                        <a href="{{ route('admin.equipment.show', $equipment->id) }}"
                                           class="btn btn-sm btn-light-primary w-100">
                                            <i class="bi bi-arrow-clockwise me-1"></i>Reset
                                        </a>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div class="card-body pt-0">
                            <div class="table-responsive">
                                <table class="table table-row-bordered gy-4 gs-7">
                                    <thead>
                                        <tr class="text-gray-600 fw-bolder fs-7 text-uppercase">
                                            <th class="text-center">No</th>
                                            <th>No Record</th>
                                            <th class="text-center">Tanggal</th>
                                            <th class="text-center">Waktu</th>
                                            <th>PM Cycle</th>
                                            <th>Teknisi</th>
                                            <th>Checker</th>
                                            <th class="text-center">Status</th>
                                            <th class="text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody class="fw-bold text-gray-600">
                                        @forelse($maintenanceHistory as $i => $rec)
                                        <tr class="history-row"
                                            onclick="window.location='{{ route('admin.records.show', $rec->id) }}'">
                                            <td class="text-center">{{ $maintenanceHistory->firstItem() + $i }}</td>
                                            <td class="fw-bolder text-primary">{{ $rec->record_number }}</td>
                                            <td class="text-center">
                                                {{ \Carbon\Carbon::parse($rec->maintenance_date)->format('d M Y') }}
                                            </td>
                                            <td class="text-center text-muted">
                                                {{ substr($rec->start_time, 0, 5) }}
                                                @if($rec->end_time)
                                                – {{ substr($rec->end_time, 0, 5) }}
                                                @endif
                                            </td>
                                            <td>
                                                @if($rec->pm_cycle)
                                                <span class="badge
                                                    @if($rec->pm_cycle == '6M') badge-light-primary
                                                    @elseif($rec->pm_cycle == '1Y') badge-light-success
                                                    @else badge-light-warning
                                                    @endif fw-bold">
                                                    {{ $rec->pm_cycle }}
                                                </span>
                                                @else <span class="text-muted">-</span>
                                                @endif
                                            </td>
                                            <td>
                                                <span class="d-flex align-items-center gap-2">
                                                    <span class="symbol symbol-25px">
                                                        <span class="symbol-label bg-light-primary fs-9 fw-bolder">
                                                            {{ strtoupper(substr($rec->technician_name, 0, 2)) }}
                                                        </span>
                                                    </span>
                                                    {{ $rec->technician_name }}
                                                </span>
                                            </td>
                                            <td>{{ $rec->checker_name ?: '-' }}</td>
                                            <td class="text-center">
                                                @if($rec->status == 'validated')
                                                    <span class="badge badge-success fw-bold px-3">Validated</span>
                                                @elseif($rec->status == 'completed')
                                                    <span class="badge badge-primary fw-bold px-3">Completed</span>
                                                @elseif($rec->status == 'in_progress')
                                                    <span class="badge badge-light-warning fw-bold px-3">In Progress</span>
                                                @elseif($rec->status == 'rejected')
                                                    <span class="badge badge-danger fw-bold px-3">Rejected</span>
                                                @endif
                                            </td>
                                            <td class="text-center" onclick="event.stopPropagation()">
                                                <a href="{{ route('admin.records.show', $rec->id) }}"
                                                   class="btn btn-sm btn-icon btn-light-primary">
                                                    <i class="bi bi-eye"></i>
                                                </a>
                                            </td>
                                        </tr>
                                        @empty
                                        <tr>
                                            <td colspan="9" class="text-center text-muted py-8">
                                                <i class="bi bi-clock-history fs-2x mb-3 d-block"></i>
                                                Belum ada riwayat maintenance
                                            </td>
                                        </tr>
                                        @endforelse
                                    </tbody>
                                </table>
                            </div>

                            @if($maintenanceHistory->hasPages())
                            <div class="d-flex justify-content-between align-items-center mt-4">
                                <div class="text-muted fs-7">
                                    {{ $maintenanceHistory->firstItem() }}–{{ $maintenanceHistory->lastItem() }}
                                    dari {{ $maintenanceHistory->total() }} record
                                </div>
                                {{ $maintenanceHistory->links('pagination::bootstrap-5') }}
                            </div>
                            @endif
                        </div>
                    </div>
                </div>{{-- /tab_history --}}

                {{-- ── TAB 4: STATISTIK ── --}}
                <div class="tab-pane fade" id="tab_chart">
                    <div class="row g-5">

                        {{-- Bar chart PM per tahun --}}
                        <div class="col-xl-8">
                            <div class="card shadow-sm h-100">
                                <div class="card-header border-0 pt-5">
                                    <h4 class="card-title fw-bolder text-gray-800">
                                        PM Record per Tahun
                                    </h4>
                                </div>
                                <div class="card-body pt-2">
                                    <canvas id="pmYearChart" style="height:280px;"></canvas>
                                </div>
                            </div>
                        </div>

                        {{-- Timeline schedule --}}
                        <div class="col-xl-4">
                            <div class="card shadow-sm h-100">
                                <div class="card-header border-0 pt-5">
                                    <h4 class="card-title fw-bolder text-gray-800">
                                        Timeline Jadwal
                                    </h4>
                                </div>
                                <div class="card-body pt-2">
                                    @forelse($schedules as $sch)
                                    <div class="timeline-item">
                                        <div class="timeline-dot
                                            @if($sch->status == 'overdue') bg-danger
                                            @elseif($sch->status == 'due') bg-warning
                                            @elseif($sch->status == 'completed') bg-success
                                            @else bg-secondary
                                            @endif">
                                        </div>
                                        <div class="fw-bolder text-gray-800 fs-7">PM {{ $sch->pm_cycle }}</div>
                                        <div class="text-muted fs-8">
                                            {{ \Carbon\Carbon::parse($sch->next_maintenance)->format('d M Y') }}
                                        </div>
                                        <span class="badge
                                            @if($sch->status == 'overdue') badge-danger
                                            @elseif($sch->status == 'due') badge-warning
                                            @elseif($sch->status == 'completed') badge-success
                                            @else badge-light-secondary
                                            @endif fw-bold mt-1" style="font-size:10px;">
                                            {{ strtoupper($sch->status) }}
                                        </span>
                                    </div>
                                    @empty
                                    <div class="text-center text-muted py-8">Belum ada jadwal</div>
                                    @endforelse
                                </div>
                            </div>
                        </div>

                    </div>
                </div>{{-- /tab_chart --}}

            </div>{{-- /tab-content --}}

        </div>
    </div>
</div>
@endsection

@push('scripts')
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
@endpush

@push('scripts')
<script>
// CountUp
KTUtil.onDOMContentLoaded(function () {
    document.querySelectorAll('[data-kt-countup="true"]').forEach(function (el) {
        var value = parseFloat((el.getAttribute('data-kt-countup-value') || '0').replace(/,/g, ''));
        new countUp.CountUp(el, value, { startVal: 0, duration: 2 }).start();
    });
});

// Bar chart PM per tahun — init saat tab statistik dibuka
document.querySelector('a[href="#tab_chart"]').addEventListener('shown.bs.tab', function () {
    var el = document.getElementById('pmYearChart');
    if (!el || el._chartInstance) return;

    el._chartInstance = new Chart(el, {
        type: 'bar',
        data: {
            labels: @json($chartYearLabels),
            datasets: [
                {
                    label: 'Total PM',
                    data: @json($chartYearTotal),
                    backgroundColor: 'rgba(0,158,247,0.75)',
                    borderRadius: 5,
                    borderSkipped: false,
                },
                {
                    label: 'Validated',
                    data: @json($chartYearValidated),
                    backgroundColor: 'rgba(80,205,137,0.85)',
                    borderRadius: 5,
                    borderSkipped: false,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true, padding: 15, font: { size: 12 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: 10,
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 12 } } },
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, font: { size: 12 } },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                }
            }
        }
    });
});
</script>
@endpush