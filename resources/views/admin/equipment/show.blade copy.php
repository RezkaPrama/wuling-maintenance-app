@extends('layouts.app')

@section('subtitle')
    Detail Equipment — {{ $equipment->equipment_name }}
@endsection

@section('styles')
<style>
    .spec-item { border-left: 3px solid #009EF7; padding-left: 12px; margin-bottom: 12px; }

    .timeline-item { position: relative; padding-left: 28px; margin-bottom: 20px; }
    .timeline-item::before {
        content: ''; position: absolute; left: 8px; top: 0; bottom: -20px;
        width: 2px; background: var(--bs-border-color);
    }
    .timeline-item:last-child::before { display: none; }
    .timeline-dot {
        position: absolute; left: 0; top: 4px;
        width: 18px; height: 18px; border-radius: 50%;
    }

    .history-row { cursor: pointer; transition: background 0.15s; }
    .history-row:hover { filter: brightness(0.97); }

    @keyframes pulse-red { 0%,100%{opacity:1} 50%{opacity:0.5} }
    .badge-pulse { animation: pulse-red 1.8s ease-in-out infinite; }

    /* QR Code panel */
    .qr-wrapper {
        background: #fff;
        border: 2px dashed #e4e6ef;
        border-radius: 12px;
        padding: 16px;
        text-align: center;
        transition: border-color 0.2s;
    }
    .qr-wrapper:hover { border-color: #009EF7; }
    .qr-wrapper img { max-width: 180px; }
</style>
@endsection

@section('content')
<div class="content d-flex flex-column flex-column-fluid" id="kt_content">

    @include('partials.toolbar')

    <div class="post d-flex flex-column-fluid" id="kt_post">
        <div id="kt_content_container" class="container-xxl">

            {{-- Flash messages --}}
            @foreach(['success' => 'success', 'error' => 'danger'] as $key => $type)
            @if(session($key))
            <div class="alert alert-{{ $type }} d-flex align-items-center p-4 mb-5">
                <i class="bi bi-{{ $type === 'success' ? 'check' : 'x' }}-circle fs-2 text-{{ $type }} me-3"></i>
                <span>{{ session($key) }}</span>
            </div>
            @endif
            @endforeach

            {{-- Breadcrumb + tombol aksi --}}
            <div class="mb-5 d-flex align-items-center justify-content-between">
                <a href="{{ route('admin.equipment.index') }}" class="btn btn-sm btn-light">
                    <i class="bi bi-arrow-left me-1"></i>Kembali ke Daftar
                </a>
                <div class="d-flex gap-2">
                    <a href="{{ route('admin.equipment.edit', $equipment->id) }}"
                       class="btn btn-sm btn-warning">
                        <i class="bi bi-pencil-square me-1"></i>Edit
                    </a>
                    <button type="button" class="btn btn-sm btn-danger"
                            onclick="confirmDelete()">
                        <i class="bi bi-trash3 me-1"></i>Hapus
                    </button>
                    {{-- Form delete tersembunyi --}}
                    <form id="deleteForm"
                          action="{{ route('admin.equipment.destroy', $equipment->id) }}"
                          method="POST" class="d-none">
                        @csrf @method('DELETE')
                    </form>
                </div>
            </div>

            {{-- ═══════════════════════════════════════════
                 HEADER CARD
            ════════════════════════════════════════════ --}}
            <div class="card shadow-sm mb-6">
                <div class="card-body pt-8 pb-0">
                    <div class="d-flex flex-wrap flex-sm-nowrap gap-5">

                        {{-- Icon --}}
                        <div class="flex-shrink-0">
                            <div class="symbol symbol-100px symbol-lg-120px">
                                <span class="symbol-label
                                    @if($equipment->status=='active') bg-light-success
                                    @elseif($equipment->status=='maintenance') bg-light-warning
                                    @else bg-light-danger @endif">
                                    <i class="bi bi-cpu-fill fs-4x
                                        @if($equipment->status=='active') text-success
                                        @elseif($equipment->status=='maintenance') text-warning
                                        @else text-danger @endif"></i>
                                </span>
                                <div class="position-absolute translate-middle start-100 top-100 border border-4 border-white rounded-circle h-15px w-15px ms-n3 mt-n3
                                    @if($equipment->status=='active') bg-success
                                    @elseif($equipment->status=='maintenance') bg-warning
                                    @else bg-danger @endif"></div>
                            </div>
                        </div>

                        {{-- Info --}}
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center mb-2 flex-wrap gap-2">
                                <h2 class="text-gray-900 fw-bolder me-2 mb-0">{{ $equipment->equipment_name }}</h2>
                                <span class="badge
                                    @if($equipment->status=='active') badge-light-success
                                    @elseif($equipment->status=='maintenance') badge-light-warning
                                    @else badge-light-danger @endif
                                    fw-bolder fs-8 px-3 py-2 text-uppercase">
                                    {{ $equipment->status }}
                                </span>
                            </div>
                            <div class="d-flex flex-wrap gap-4 fw-bold fs-7 text-gray-400 mb-4">
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
                            {{-- Mini stat --}}
                            <div class="d-flex flex-wrap gap-5 mb-4">
                                @foreach([
                                    ['val' => $totalPMAll,  'label' => 'Total PM Record', 'color' => 'text-gray-800'],
                                    ['val' => $totalPMDone, 'label' => 'PM Selesai',       'color' => 'text-success'],
                                ] as $s)
                                <div class="border border-dashed rounded px-4 py-3">
                                    <div class="fw-bolder fs-3 {{ $s['color'] }}"
                                         data-kt-countup="true" data-kt-countup-value="{{ $s['val'] }}">0</div>
                                    <div class="text-muted fs-8 fw-bold">{{ $s['label'] }}</div>
                                </div>
                                @endforeach
                                <div class="border border-dashed rounded px-4 py-3">
                                    <div class="fw-bolder fs-3 text-primary">
                                        {{ $lastRecord ? \Carbon\Carbon::parse($lastRecord->maintenance_date)->format('d M Y') : '-' }}
                                    </div>
                                    <div class="text-muted fs-8 fw-bold">PM Terakhir</div>
                                </div>
                                <div class="border border-dashed rounded px-4 py-3">
                                    <div class="fw-bolder fs-3 text-gray-800">{{ $schedules->count() }}</div>
                                    <div class="text-muted fs-8 fw-bold">Total Schedule</div>
                                </div>
                            </div>
                        </div>

                        {{-- ── QR CODE PANEL ── --}}
                        <div class="flex-shrink-0" style="min-width:220px;">
                            <div class="qr-wrapper">
                                <div class="fw-bolder text-gray-700 fs-7 mb-3">
                                    <i class="bi bi-qr-code me-1 text-primary"></i>QR Code Equipment
                                </div>
                                {{-- QR SVG di-embed sebagai base64 --}}
                                <img src="data:image/svg+xml;base64,{{ $qrCode }}"
                                     alt="QR Code {{ $equipment->equipment_code }}"
                                     class="mb-3">
                                <div class="text-muted fs-9 mb-3">
                                    Scan untuk langsung membuat<br>maintenance record
                                </div>
                                <div class="d-grid gap-2">
                                    <a href="{{ route('admin.equipment.qr', $equipment->id) }}"
                                       class="btn btn-sm btn-light-primary">
                                        <i class="bi bi-download me-1"></i>Unduh QR (PNG)
                                    </a>
                                    <button type="button" class="btn btn-sm btn-light"
                                            onclick="printQr()">
                                        <i class="bi bi-printer me-1"></i>Cetak QR
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>

                    {{-- Tabs --}}
                    <ul class="nav nav-stretch nav-line-tabs nav-line-tabs-2x border-transparent fs-5 fw-bolder mt-4">
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
            </div>

            {{-- ═══════════════════════════════════════════
                 TAB CONTENT
            ════════════════════════════════════════════ --}}
            <div class="tab-content">

                {{-- TAB: Informasi --}}
                <div class="tab-pane fade show active" id="tab_info">
                    <div class="row g-5">
                        <div class="col-xl-6">
                            <div class="card shadow-sm h-100">
                                <div class="card-header border-0 pt-5">
                                    <h4 class="card-title fw-bolder text-gray-800">
                                        <i class="bi bi-list-check text-primary me-2"></i>Spesifikasi Teknis
                                    </h4>
                                    <div class="card-toolbar">
                                        <a href="{{ route('admin.equipment.edit', $equipment->id) }}"
                                           class="btn btn-sm btn-light-warning">
                                            <i class="bi bi-pencil me-1"></i>Edit
                                        </a>
                                    </div>
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
                                            <div class="mt-3">
                                                <a href="{{ route('admin.equipment.edit', $equipment->id) }}"
                                                   class="btn btn-sm btn-light-primary">
                                                    <i class="bi bi-plus-circle me-1"></i>Tambah Spesifikasi
                                                </a>
                                            </div>
                                        </div>
                                    @endif
                                </div>
                            </div>
                        </div>
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
                                            @foreach([
                                                ['Kode Equipment', $equipment->equipment_code],
                                                ['Nama Equipment', $equipment->equipment_name],
                                                ['PM Number',      $equipment->pm_number],
                                                ['TIS Number',     $equipment->tis_number ?: '-'],
                                                ['ETM Group',      $equipment->etm_group],
                                                ['Lokasi',         $equipment->location ?: '-'],
                                            ] as [$label, $value])
                                            <tr>
                                                <td class="text-muted fw-bold w-150px">{{ $label }}</td>
                                                <td class="fw-bolder">{{ $value }}</td>
                                            </tr>
                                            @endforeach
                                            <tr>
                                                <td class="text-muted fw-bold">Status Unit</td>
                                                <td>
                                                    <span class="badge
                                                        @if($equipment->status=='active') badge-light-success
                                                        @elseif($equipment->status=='maintenance') badge-light-warning
                                                        @else badge-light-danger @endif
                                                        fw-bold text-uppercase">
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
                </div>

                {{-- TAB: Jadwal PM --}}
                <div class="tab-pane fade" id="tab_schedule">
                    <div class="card shadow-sm">
                        <div class="card-header border-0 pt-5">
                            <h4 class="card-title fw-bolder text-gray-800">
                                <i class="bi bi-calendar-event text-primary me-2"></i>Jadwal PM
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
                                                    @if($sch->pm_cycle=='6M') badge-light-primary
                                                    @elseif($sch->pm_cycle=='1Y') badge-light-success
                                                    @else badge-light-warning @endif fw-bold fs-7">
                                                    {{ $sch->pm_cycle }}
                                                </span>
                                            </td>
                                            <td class="text-center text-muted">
                                                {{ $sch->last_maintenance
                                                    ? \Carbon\Carbon::parse($sch->last_maintenance)->format('d M Y')
                                                    : 'Belum ada' }}
                                            </td>
                                            <td class="text-center fw-bolder
                                                @if($sch->status=='overdue') text-danger
                                                @elseif($sch->status=='due') text-warning
                                                @else text-gray-800 @endif">
                                                {{ \Carbon\Carbon::parse($sch->next_maintenance)->format('d M Y') }}
                                                @if($sch->status=='overdue')
                                                <div class="text-danger fs-8 fw-bold">
                                                    ({{ \Carbon\Carbon::parse($sch->next_maintenance)->diffForHumans() }})
                                                </div>
                                                @endif
                                            </td>
                                            <td class="text-center">
                                                @if($sch->status=='overdue')
                                                    <span class="badge badge-danger badge-pulse fw-bold px-3">Overdue</span>
                                                @elseif($sch->status=='due')
                                                    <span class="badge badge-warning fw-bold px-3">Due</span>
                                                @elseif($sch->status=='completed')
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
                                                Belum ada jadwal PM
                                            </td>
                                        </tr>
                                        @endforelse
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {{-- TAB: Riwayat Maintenance --}}
                <div class="tab-pane fade" id="tab_history">
                    <div class="card shadow-sm">
                        <div class="card-header border-0 pt-5">
                            <h4 class="card-title fw-bolder text-gray-800">
                                <i class="bi bi-clock-history text-primary me-2"></i>Riwayat Maintenance
                            </h4>
                        </div>
                        <div class="card-body pt-3 pb-3 border-bottom">
                            <form method="GET" action="{{ route('admin.equipment.show', $equipment->id) }}">
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
                                            @foreach(['in_progress'=>'In Progress','completed'=>'Completed','validated'=>'Validated','rejected'=>'Rejected'] as $v=>$l)
                                            <option value="{{ $v }}" {{ $filterStatus == $v ? 'selected' : '' }}>{{ $l }}</option>
                                            @endforeach
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
                                            <td class="text-center">{{ \Carbon\Carbon::parse($rec->maintenance_date)->format('d M Y') }}</td>
                                            <td class="text-center text-muted">
                                                {{ substr($rec->start_time, 0, 5) }}
                                                @if($rec->end_time) – {{ substr($rec->end_time, 0, 5) }} @endif
                                            </td>
                                            <td>
                                                @if($rec->pm_cycle)
                                                <span class="badge
                                                    @if($rec->pm_cycle=='6M') badge-light-primary
                                                    @elseif($rec->pm_cycle=='1Y') badge-light-success
                                                    @else badge-light-warning @endif fw-bold">
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
                                                @php
                                                $statusMap = [
                                                    'validated'   => ['success', 'Validated'],
                                                    'completed'   => ['primary', 'Completed'],
                                                    'in_progress' => ['warning', 'In Progress'],
                                                    'rejected'    => ['danger',  'Rejected'],
                                                ];
                                                [$color, $text] = $statusMap[$rec->status] ?? ['secondary', $rec->status];
                                                @endphp
                                                <span class="badge badge-{{ $color }} fw-bold px-3">{{ $text }}</span>
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
                </div>

                {{-- TAB: Statistik --}}
                <div class="tab-pane fade" id="tab_chart">
                    <div class="row g-5">
                        <div class="col-xl-8">
                            <div class="card shadow-sm h-100">
                                <div class="card-header border-0 pt-5">
                                    <h4 class="card-title fw-bolder">PM Record per Tahun</h4>
                                </div>
                                <div class="card-body pt-2">
                                    <canvas id="pmYearChart" style="height:280px;"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-4">
                            <div class="card shadow-sm h-100">
                                <div class="card-header border-0 pt-5">
                                    <h4 class="card-title fw-bolder">Timeline Jadwal</h4>
                                </div>
                                <div class="card-body pt-2">
                                    @forelse($schedules as $sch)
                                    <div class="timeline-item">
                                        <div class="timeline-dot
                                            @if($sch->status=='overdue') bg-danger
                                            @elseif($sch->status=='due') bg-warning
                                            @elseif($sch->status=='completed') bg-success
                                            @else bg-secondary @endif">
                                        </div>
                                        <div class="fw-bolder text-gray-800 fs-7">PM {{ $sch->pm_cycle }}</div>
                                        <div class="text-muted fs-8">
                                            {{ \Carbon\Carbon::parse($sch->next_maintenance)->format('d M Y') }}
                                        </div>
                                        <span class="badge
                                            @if($sch->status=='overdue') badge-danger
                                            @elseif($sch->status=='due') badge-warning
                                            @elseif($sch->status=='completed') badge-success
                                            @else badge-light-secondary @endif
                                            fw-bold mt-1" style="font-size:10px;">
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
                </div>

            </div>{{-- /tab-content --}}

        </div>
    </div>
</div>

{{-- Modal Print QR --}}
<div class="modal fade" id="modalPrintQr" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered mw-400px">
        <div class="modal-content">
            <div class="modal-header border-0 pb-0">
                <h5 class="modal-title fw-bolder">Cetak QR Code</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body text-center py-6" id="printArea">
                <div class="fw-bolder fs-5 text-gray-800 mb-1">{{ $equipment->equipment_name }}</div>
                <div class="text-muted fs-7 mb-4">{{ $equipment->equipment_code }} · {{ $equipment->etm_group }}</div>
                <img src="data:image/svg+xml;base64,{{ $qrCode }}"
                     alt="QR Code" style="width:200px;">
                <div class="text-muted fs-8 mt-3">Scan untuk membuat Maintenance Record</div>
            </div>
            <div class="modal-footer border-0 pt-0">
                <button type="button" class="btn btn-primary w-100" onclick="window.print()">
                    <i class="bi bi-printer me-1"></i>Cetak
                </button>
            </div>
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

// Chart: lazy load saat tab statistik dibuka
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
                    borderRadius: 5, borderSkipped: false,
                },
                {
                    label: 'Validated',
                    data: @json($chartYearValidated),
                    backgroundColor: 'rgba(80,205,137,0.85)',
                    borderRadius: 5, borderSkipped: false,
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { usePointStyle: true, padding: 15, font: { size: 12 } } },
                tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, mode: 'index', intersect: false }
            },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' } }
            }
        }
    });
});

// Konfirmasi hapus dengan SweetAlert
function confirmDelete() {
    Swal.fire({
        title: 'Hapus Equipment?',
        html: `Anda akan menghapus <strong>{{ $equipment->equipment_name }}</strong>.<br>
               Tindakan ini tidak dapat dibatalkan.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal',
        buttonsStyling: false,
        customClass: {
            confirmButton: 'btn btn-danger me-3',
            cancelButton:  'btn btn-light',
        }
    }).then(function (result) {
        if (result.isConfirmed) {
            document.getElementById('deleteForm').submit();
        }
    });
}

// Print QR
function printQr() {
    var modal = new bootstrap.Modal(document.getElementById('modalPrintQr'));
    modal.show();
}
</script>
@endpush