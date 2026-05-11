{{-- resources/views/admin/maintenance/record/index.blade.php --}}
@extends('layouts.app')

@section('title')
    Jadwal Preventive Maintenance Record
@endsection
@section('subtitle')
    List Jadwal Preventive Maintenance Record
@endsection
@section('menuUtama')
    Menu Utama
@endsection
@section('menuItem')
    Maintenance Record
@endsection

@section('content')

    <div class="content d-flex flex-column flex-column-fluid" id="kt_content">

        @include('partials.toolbar')

        <div class="post d-flex flex-column-fluid" id="kt_post">
            <div id="kt_content_container" class="container-xxl">
                <div class="d-flex align-items-center justify-content-between mb-6">
                    <div>
                        <h1 class="fs-2 fw-bold text-gray-900 mb-1">Pelaksanaan PM</h1>
                        <span class="text-muted fs-6">Rekap dan pantau semua record pelaksanaan preventive maintenance</span>
                    </div>
                    <a href="{{ route('admin.records.create') }}" class="btn btn-primary">
                        <i class="bi bi-plus-circle me-2"></i>Buat Record PM
                    </a>
                </div>

                @if (session('success'))
                    <div class="alert alert-success d-flex align-items-center mb-5">
                        <i class="bi bi-check-circle me-3 fs-4"></i>
                        <div>{{ session('success') }}</div>
                    </div>
                @endif

                {{-- ── STAT CARDS ── --}}
                <div class="row g-4 mb-6">
                    @php
                        $statCards = [
                            [
                                'label' => 'Total Record',
                                'value' => $stats->total ?? 0,
                                'icon' => 'bi-file-earmark-check',
                                'color' => 'primary',
                            ],
                            [
                                'label' => 'In Progress',
                                'value' => $stats->in_progress ?? 0,
                                'icon' => 'bi-hourglass-split',
                                'color' => 'warning',
                            ],
                            [
                                'label' => 'Selesai (Cek)',
                                'value' => $stats->completed ?? 0,
                                'icon' => 'bi-clipboard-check',
                                'color' => 'info',
                            ],
                            [
                                'label' => 'Validated',
                                'value' => $stats->validated ?? 0,
                                'icon' => 'bi-patch-check',
                                'color' => 'success',
                            ],
                            [
                                'label' => 'Rejected',
                                'value' => $stats->rejected ?? 0,
                                'icon' => 'bi-x-circle',
                                'color' => 'danger',
                            ],
                        ];
                    @endphp
                    @foreach ($statCards as $card)
                        <div class="col-6 col-lg">
                            <div class="card card-flush h-100 border-0 shadow-sm">
                                <div class="card-body d-flex align-items-center gap-3 p-5">
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

                {{-- ── FILTER + TABEL ── --}}
                <div class="card card-flush border-0 shadow-sm">
                    <div class="card-header border-0 pt-6">
                        <div class="card-title flex-wrap gap-2">
                            {{-- Search --}}
                            <form method="GET" class="d-flex gap-2 flex-wrap align-items-center" id="filterForm">
                                <div class="input-group input-group-sm" style="width: 220px;">
                                    <span class="input-group-text border-0 bg-light">
                                        <i class="bi bi-search text-muted"></i>
                                    </span>
                                    <input type="text" name="search" class="form-control border-0 bg-light"
                                        placeholder="Cari no record, equipment..." value="{{ $search }}">
                                </div>
                                <select name="filter_status" class="form-select form-select-sm w-auto"
                                    onchange="this.form.submit()">
                                    <option value="all" @selected(!$filterStatus || $filterStatus === 'all')>Semua Status</option>
                                    <option value="in_progress" @selected($filterStatus === 'in_progress')>In Progress</option>
                                    <option value="completed" @selected($filterStatus === 'completed')>Completed</option>
                                    <option value="validated" @selected($filterStatus === 'validated')>Validated</option>
                                    <option value="rejected" @selected($filterStatus === 'rejected')>Rejected</option>
                                </select>
                                <select name="filter_cycle" class="form-select form-select-sm w-auto"
                                    onchange="this.form.submit()">
                                    <option value="all" @selected(!$filterCycle || $filterCycle === 'all')>Semua Cycle</option>
                                    <option value="6M" @selected($filterCycle === '6M')>6 Bulan</option>
                                    <option value="1Y" @selected($filterCycle === '1Y')>1 Tahun</option>
                                    <option value="2Y" @selected($filterCycle === '2Y')>2 Tahun</option>
                                </select>
                                <input type="month" name="filter_month" class="form-control form-control-sm w-auto"
                                    value="{{ $filterMonth }}" onchange="this.form.submit()">
                                <button type="submit" class="btn btn-sm btn-primary">
                                    <i class="bi bi-search"></i>
                                </button>
                                @if ($search || ($filterStatus && $filterStatus !== 'all') || $filterCycle || $filterMonth)
                                    <a href="{{ route('admin.records.index') }}" class="btn btn-sm btn-light-danger">
                                        <i class="bi bi-x-circle me-1"></i>Reset
                                    </a>
                                @endif
                            </form>
                        </div>
                        <div class="card-toolbar">
                            <a href="{{ route('admin.records.create') }}" class="btn btn-sm btn-light-primary">
                                <i class="bi bi-plus-circle me-1"></i>Buat Record
                            </a>
                        </div>
                    </div>

                    <div class="card-body pt-0">
                        @if ($records->isEmpty())
                            <div class="text-center py-10">
                                <i class="bi bi-file-earmark-x fs-1 text-muted mb-3 d-block"></i>
                                <p class="text-muted">Tidak ada record yang ditemukan.</p>
                                <a href="{{ route('admin.records.create') }}" class="btn btn-sm btn-primary">
                                    <i class="bi bi-plus me-1"></i>Buat Record Pertama
                                </a>
                            </div>
                        @else
                            <div class="table-responsive">
                                <table class="table table-row-dashed table-row-gray-200 align-middle gs-0 gy-3">
                                    <thead>
                                        <tr class="fw-bold text-muted fs-7 text-uppercase">
                                            <th class="ps-4">No Record</th>
                                            <th>Equipment</th>
                                            <th>Template</th>
                                            <th>Tanggal</th>
                                            <th>Teknisi</th>
                                            <th>Status</th>
                                            <th>Durasi</th>
                                            <th class="text-end pe-4">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach ($records as $r)
                                            @php
                                                $statusMap = [
                                                    'in_progress' => [
                                                        'class' => 'badge-light-warning',
                                                        'label' => 'In Progress',
                                                        'icon' => 'bi-hourglass-split',
                                                    ],
                                                    'completed' => [
                                                        'class' => 'badge-light-info',
                                                        'label' => 'Menunggu Cek',
                                                        'icon' => 'bi-clipboard-check',
                                                    ],
                                                    'validated' => [
                                                        'class' => 'badge-light-success',
                                                        'label' => 'Validated',
                                                        'icon' => 'bi-patch-check',
                                                    ],
                                                    'rejected' => [
                                                        'class' => 'badge-light-danger',
                                                        'label' => 'Rejected',
                                                        'icon' => 'bi-x-circle',
                                                    ],
                                                ];
                                                $st = $statusMap[$r->status] ?? [
                                                    'class' => 'badge-light',
                                                    'label' => $r->status,
                                                    'icon' => 'bi-circle',
                                                ];

                                                // Hitung durasi
                                                $duration = null;
                                                if ($r->start_time && $r->end_time) {
                                                    $start = \Carbon\Carbon::parse(
                                                        $r->maintenance_date . ' ' . $r->start_time,
                                                    );
                                                    $end = \Carbon\Carbon::parse(
                                                        $r->maintenance_date . ' ' . $r->end_time,
                                                    );
                                                    $duration = $start->diffInMinutes($end) . ' mnt';
                                                }
                                            @endphp
                                            <tr>
                                                <td class="ps-4">
                                                    <a href="{{ route('admin.records.show', $r->id) }}"
                                                        class="fw-bold text-primary">
                                                        {{ $r->record_number }}
                                                    </a>
                                                </td>
                                                <td>
                                                    <div class="fw-semibold text-gray-800">{{ $r->equipment_name }}</div>
                                                    <div class="text-muted fs-8">{{ $r->equipment_code }}</div>
                                                </td>
                                                <td>
                                                    <div class="text-gray-700 fs-7">{{ Str::limit($r->template_name, 25) }}
                                                    </div>
                                                    <span class="badge badge-light-primary fs-8">{{ $r->pm_cycle }}</span>
                                                </td>
                                                <td class="text-muted fs-7">
                                                    {{ \Carbon\Carbon::parse($r->maintenance_date)->format('d M Y') }}
                                                </td>
                                                <td class="text-muted fs-7">{{ $r->technician_name }}</td>
                                                <td>
                                                    <span class="badge {{ $st['class'] }} fw-semibold px-3 py-2">
                                                        <i class="bi {{ $st['icon'] }} me-1"></i>{{ $st['label'] }}
                                                    </span>
                                                    @if ($r->checker_name)
                                                        <div class="text-muted fs-8 mt-1">
                                                            Checker: {{ $r->checker_name }}
                                                        </div>
                                                    @endif
                                                </td>
                                                <td class="text-muted fs-7">
                                                    {{ $duration ?? ($r->status === 'in_progress' ? '<span class="text-warning">Running...</span>' : '—') }}
                                                </td>
                                                <td class="text-end pe-4">
                                                    <div class="d-flex justify-content-end gap-2">
                                                        @if ($r->status === 'in_progress')
                                                            <a href="{{ route('admin.records.work', $r->id) }}"
                                                                class="btn btn-sm btn-warning">
                                                                <i class="bi bi-pencil-fill me-1"></i>Kerjakan
                                                            </a>
                                                        @else
                                                            <a href="{{ route('admin.records.show', $r->id) }}"
                                                                class="btn btn-sm btn-light-primary">
                                                                <i class="bi bi-eye me-1"></i>Detail
                                                            </a>
                                                        @endif
                                                        @if ($r->status === 'completed')
                                                            <a href="{{ route('admin.records.show', $r->id) }}#validate"
                                                                class="btn btn-sm btn-success">
                                                                <i class="bi bi-check-circle me-1"></i>Validasi
                                                            </a>
                                                        @endif
                                                    </div>
                                                </td>
                                            </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>

                            <div class="d-flex justify-content-between align-items-center mt-4">
                                <div class="text-muted fs-7">
                                    Menampilkan {{ $records->firstItem() }}–{{ $records->lastItem() }}
                                    dari {{ $records->total() }} record
                                </div>
                                {{ $records->links() }}
                            </div>
                        @endif
                    </div>
                </div>
            </div>
        </div>


    </div>

@endsection
