@extends('layouts.app')

@section('subtitle')
    Daftar Equipment
@endsection

@section('styles')
<style>
    .card-stat { transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .card-stat:hover { transform: translateY(-3px); box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.12) !important; }

    .filter-status-btn { transition: all 0.25s ease; }
    .filter-status-btn.active { transform: scale(1.05); box-shadow: 0 0.4rem 1rem rgba(0,0,0,0.14); }

    .equipment-row { cursor: pointer; transition: background 0.15s ease; }
    .equipment-row:hover { filter: brightness(0.97); }

    @keyframes pulse-red { 0%,100%{opacity:1} 50%{opacity:0.5} }
    .badge-pulse { animation: pulse-red 1.8s ease-in-out infinite; }

    .status-dot {
        width: 9px; height: 9px; border-radius: 50%; display: inline-block;
    }
</style>
@endsection

@section('content')
<div class="content d-flex flex-column flex-column-fluid" id="kt_content">

    @include('partials.toolbar')

    <div class="post d-flex flex-column-fluid" id="kt_post">
        <div id="kt_content_container" class="container-xxl">

            {{-- ── FLASH MESSAGES ── --}}
            @if(session('success'))
            <div class="alert alert-success d-flex align-items-center p-4 mb-5">
                <i class="bi bi-check-circle fs-2 text-success me-3"></i>
                <span>{{ session('success') }}</span>
            </div>
            @endif
            @if(session('error'))
            <div class="alert alert-danger d-flex align-items-center p-4 mb-5">
                <i class="bi bi-x-circle fs-2 text-danger me-3"></i>
                <span>{{ session('error') }}</span>
            </div>
            @endif

            {{-- ═══════════════════════════════════════════════
                 ROW 1 — STAT CARDS
            ════════════════════════════════════════════════ --}}
            <div class="row g-5 g-xl-8 mb-5">

                <div class="col-xl-3 col-md-6">
                    <div class="card card-stat bg-body border-0 shadow-sm h-100">
                        <div class="card-body d-flex align-items-center p-6">
                            <div class="symbol symbol-50px me-5">
                                <span class="symbol-label bg-light-success">
                                    <i class="bi bi-cpu fs-2x text-success"></i>
                                </span>
                            </div>
                            <div>
                                <div class="fw-bolder fs-2x text-gray-800"
                                     data-kt-countup="true"
                                     data-kt-countup-value="{{ $totalActive }}">0</div>
                                <div class="fw-bold fs-7 text-gray-400">Equipment Aktif</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-xl-3 col-md-6">
                    <div class="card card-stat bg-body border-0 shadow-sm h-100">
                        <div class="card-body d-flex align-items-center p-6">
                            <div class="symbol symbol-50px me-5">
                                <span class="symbol-label bg-light-warning">
                                    <i class="bi bi-wrench fs-2x text-warning"></i>
                                </span>
                            </div>
                            <div>
                                <div class="fw-bolder fs-2x text-gray-800"
                                     data-kt-countup="true"
                                     data-kt-countup-value="{{ $totalMaintenance }}">0</div>
                                <div class="fw-bold fs-7 text-gray-400">Sedang Maintenance</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-xl-3 col-md-6">
                    <div class="card card-stat bg-body border-0 shadow-sm h-100">
                        <div class="card-body d-flex align-items-center p-6">
                            <div class="symbol symbol-50px me-5">
                                <span class="symbol-label bg-light-danger">
                                    <i class="bi bi-slash-circle fs-2x text-danger"></i>
                                </span>
                            </div>
                            <div>
                                <div class="fw-bolder fs-2x text-gray-800"
                                     data-kt-countup="true"
                                     data-kt-countup-value="{{ $totalInactive }}">0</div>
                                <div class="fw-bold fs-7 text-gray-400">Tidak Aktif</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-xl-3 col-md-6">
                    <div class="card card-stat bg-body border-0 shadow-sm h-100">
                        <div class="card-body d-flex align-items-center p-6">
                            <div class="symbol symbol-50px me-5">
                                <span class="symbol-label bg-light-danger">
                                    <i class="bi bi-exclamation-octagon fs-2x text-danger"></i>
                                </span>
                            </div>
                            <div>
                                <div class="fw-bolder fs-2x text-gray-800"
                                     data-kt-countup="true"
                                     data-kt-countup-value="{{ $totalOverdue }}">0</div>
                                <div class="fw-bold fs-7 text-gray-400">PM Overdue</div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {{-- ═══════════════════════════════════════════════
                 ROW 2 — TABEL EQUIPMENT
            ════════════════════════════════════════════════ --}}
            <div class="card shadow-sm">

                {{-- Header + Search --}}
                <div class="card-header border-0 pt-6">
                    <div class="card-title">
                        <h3 class="fw-bolder text-gray-800">
                            <i class="bi bi-cpu text-primary me-2"></i>Daftar Equipment
                        </h3>
                    </div>
                    <div class="card-toolbar">
                        {{-- Search --}}
                        <form method="GET" action="{{ route('admin.equipment.index') }}" class="d-inline me-2">
                            @foreach(request()->except(['search','page']) as $key => $val)
                                <input type="hidden" name="{{ $key }}" value="{{ $val }}">
                            @endforeach
                            <div class="d-flex align-items-center position-relative">
                                <i class="bi bi-search position-absolute ms-3 text-muted"></i>
                                <input type="text" name="search"
                                       class="form-control form-control-solid w-250px ps-10"
                                       placeholder="Cari kode, nama, group..."
                                       value="{{ $search }}">
                                @if($search)
                                <a href="{{ route('admin.equipment.index', request()->except('search','page')) }}"
                                   class="btn btn-sm btn-icon btn-light-danger ms-2">
                                    <i class="bi bi-x-lg"></i>
                                </a>
                                @endif
                            </div>
                        </form>
                    </div>
                </div>

                {{-- Filter Bar --}}
                <div class="card-body pt-3 pb-3 border-bottom">
                    <form method="GET" action="{{ route('admin.equipment.index') }}" id="filterForm">
                        <input type="hidden" name="search" value="{{ $search }}">

                        <div class="row g-3 align-items-end">

                            {{-- Filter ETM Group --}}
                            <div class="col-lg-3">
                                <label class="form-label fw-bold fs-7 mb-1">ETM Group</label>
                                <select name="filter_group" class="form-select form-select-solid"
                                        onchange="this.form.submit()">
                                    <option value="">Semua Group</option>
                                    @foreach($etmGroups as $g)
                                    <option value="{{ $g }}" {{ $filterGroup == $g ? 'selected' : '' }}>
                                        {{ $g }}
                                    </option>
                                    @endforeach
                                </select>
                            </div>

                            {{-- Filter Lokasi --}}
                            <div class="col-lg-3">
                                <label class="form-label fw-bold fs-7 mb-1">Lokasi</label>
                                <select name="filter_location" class="form-select form-select-solid"
                                        onchange="this.form.submit()">
                                    <option value="">Semua Lokasi</option>
                                    @foreach($locations as $loc)
                                    <option value="{{ $loc }}" {{ $filterLoc == $loc ? 'selected' : '' }}>
                                        {{ $loc }}
                                    </option>
                                    @endforeach
                                </select>
                            </div>

                            {{-- Per Page --}}
                            <div class="col-lg-2">
                                <label class="form-label fw-bold fs-7 mb-1">Tampilkan</label>
                                <select name="per_page" class="form-select form-select-solid"
                                        onchange="this.form.submit()">
                                    @foreach([10,25,50,100] as $p)
                                    <option value="{{ $p }}" {{ request('per_page',25) == $p ? 'selected' : '' }}>
                                        {{ $p }} data
                                    </option>
                                    @endforeach
                                </select>
                            </div>

                            {{-- Reset --}}
                            <div class="col-lg-2">
                                <a href="{{ route('admin.equipment.index') }}"
                                   class="btn btn-light-primary btn-sm w-100">
                                    <i class="bi bi-arrow-clockwise me-1"></i>Reset
                                </a>
                            </div>

                        </div>

                        {{-- Filter Status (tombol) --}}
                        <div class="mt-4">
                            <label class="form-label fw-bold fs-7 mb-2">Status Equipment</label>
                            <input type="hidden" name="filter_status" id="filterStatusInput"
                                   value="{{ $filterStatus ?? 'all' }}">
                            <div class="d-flex flex-wrap gap-2">
                                @foreach([
                                    'all'         => ['label' => 'Semua',       'class' => 'btn-light-secondary'],
                                    'active'      => ['label' => 'Aktif',       'class' => 'btn-light-success'],
                                    'maintenance' => ['label' => 'Maintenance', 'class' => 'btn-light-warning'],
                                    'inactive'    => ['label' => 'Tidak Aktif', 'class' => 'btn-light-danger'],
                                ] as $val => $opt)
                                <button type="button"
                                        class="btn btn-sm {{ $opt['class'] }} filter-status-btn {{ ($filterStatus ?? 'all') == $val ? 'active' : '' }}"
                                        data-status="{{ $val }}">
                                    {{ $opt['label'] }}
                                </button>
                                @endforeach
                            </div>
                        </div>

                    </form>
                </div>

                {{-- Tabel --}}
                <div class="card-body pt-0">
                    <div class="table-responsive">
                        <table class="table table-row-bordered gy-4 gs-7 border rounded">
                            <thead>
                                <tr class="text-start text-gray-600 fw-bolder fs-7 text-uppercase">
                                    <th class="text-center min-w-40px">No</th>
                                    <th class="min-w-100px">Kode</th>
                                    <th class="min-w-200px">Nama Equipment</th>
                                    <th class="min-w-100px text-center">ETM Group</th>
                                    <th class="min-w-100px text-center">Lokasi</th>
                                    <th class="min-w-100px text-center">PM Cycle</th>
                                    <th class="min-w-120px text-center">Jadwal PM Berikutnya</th>
                                    <th class="min-w-100px text-center">Status Jadwal</th>
                                    <th class="min-w-100px text-center">Status Unit</th>
                                    <th class="min-w-80px text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody class="fw-bold text-gray-600">
                                @forelse($equipments as $i => $eq)
                                <tr class="equipment-row
                                    @if($eq->status == 'maintenance') table-warning
                                    @elseif($eq->status == 'inactive') table-danger
                                    @endif"
                                    onclick="window.location='{{ route('admin.equipment.show', $eq->id) }}'">

                                    <td class="text-center">{{ $equipments->firstItem() + $i }}</td>

                                    <td>
                                        <span class="badge badge-light-info fw-bolder">
                                            {{ $eq->equipment_code }}
                                        </span>
                                    </td>

                                    <td>
                                        <div class="fw-bolder text-gray-800">{{ $eq->equipment_name }}</div>
                                        <div class="text-muted fs-8">PM: {{ $eq->pm_number }}</div>
                                    </td>

                                    <td class="text-center">
                                        <span class="badge badge-light-info fw-bold">
                                            {{ $eq->etm_group ?: '-' }}
                                        </span>
                                    </td>

                                    <td class="text-center text-muted">
                                        {{ $eq->location ?: '-' }}
                                    </td>

                                    <td class="text-center">
                                        @if($eq->pm_cycle)
                                        <span class="badge
                                            @if($eq->pm_cycle == '6M') badge-light-primary
                                            @elseif($eq->pm_cycle == '1Y') badge-light-success
                                            @else badge-light-warning
                                            @endif fw-bold">
                                            {{ $eq->pm_cycle }}
                                        </span>
                                        @else
                                        <span class="text-muted">-</span>
                                        @endif
                                    </td>

                                    <td class="text-center fw-bold
                                        @if($eq->schedule_status == 'overdue') text-danger
                                        @elseif($eq->schedule_status == 'due') text-warning
                                        @else text-gray-700
                                        @endif">
                                        @if($eq->next_maintenance)
                                            {{ \Carbon\Carbon::parse($eq->next_maintenance)->format('d M Y') }}
                                        @else
                                            <span class="text-muted">Belum dijadwalkan</span>
                                        @endif
                                    </td>

                                    <td class="text-center">
                                        @if($eq->schedule_status == 'overdue')
                                            <span class="badge badge-danger badge-pulse fw-bold px-3">Overdue</span>
                                        @elseif($eq->schedule_status == 'due')
                                            <span class="badge badge-warning fw-bold px-3">Due</span>
                                        @elseif($eq->schedule_status == 'completed')
                                            <span class="badge badge-success fw-bold px-3">Selesai</span>
                                        @elseif($eq->schedule_status == 'pending')
                                            <span class="badge badge-light-secondary fw-bold px-3">Pending</span>
                                        @else
                                            <span class="text-muted">-</span>
                                        @endif
                                    </td>

                                    <td class="text-center">
                                        @if($eq->status == 'active')
                                            <span class="d-flex align-items-center justify-content-center gap-1">
                                                <span class="status-dot bg-success"></span>
                                                <span class="text-success fw-bold">Aktif</span>
                                            </span>
                                        @elseif($eq->status == 'maintenance')
                                            <span class="d-flex align-items-center justify-content-center gap-1">
                                                <span class="status-dot bg-warning"></span>
                                                <span class="text-warning fw-bold">Maintenance</span>
                                            </span>
                                        @else
                                            <span class="d-flex align-items-center justify-content-center gap-1">
                                                <span class="status-dot bg-danger"></span>
                                                <span class="text-danger fw-bold">Inactive</span>
                                            </span>
                                        @endif
                                    </td>

                                    <td class="text-center" onclick="event.stopPropagation()">
                                        <a href="{{ route('admin.equipment.show', $eq->id) }}"
                                           class="btn btn-sm btn-icon btn-light-primary"
                                           data-bs-toggle="tooltip" title="Lihat Detail">
                                            <i class="bi bi-eye"></i>
                                        </a>
                                    </td>

                                </tr>
                                @empty
                                <tr>
                                    <td colspan="10" class="text-center text-muted py-10">
                                        <i class="bi bi-cpu fs-2x text-muted mb-3 d-block"></i>
                                        Tidak ada equipment yang sesuai filter
                                    </td>
                                </tr>
                                @endforelse
                            </tbody>
                        </table>
                    </div>

                    {{-- Pagination --}}
                    @if($equipments->hasPages())
                    <div class="d-flex justify-content-between align-items-center mt-5">
                        <div class="text-muted fs-7">
                            Menampilkan {{ $equipments->firstItem() }}–{{ $equipments->lastItem() }}
                            dari {{ $equipments->total() }} equipment
                        </div>
                        {{ $equipments->links('pagination::bootstrap-5') }}
                    </div>
                    @endif

                </div>
            </div>{{-- /card --}}

        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
// Filter status tombol
document.querySelectorAll('.filter-status-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.filter-status-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        document.getElementById('filterStatusInput').value = this.dataset.status;
        document.getElementById('filterForm').submit();
    });
});

// CountUp
KTUtil.onDOMContentLoaded(function () {
    document.querySelectorAll('[data-kt-countup="true"]').forEach(function (el) {
        var value = parseFloat((el.getAttribute('data-kt-countup-value') || '0').replace(/,/g, ''));
        new countUp.CountUp(el, value, { startVal: 0, duration: 2 }).start();
    });

    // Tooltips
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (el) {
        new bootstrap.Tooltip(el);
    });
});
</script>
@endpush