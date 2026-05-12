{{-- resources/views/admin/check-sheet/template/index.blade.php --}}
@extends('layouts.app')

@section('title')
    Check Sheet
@endsection
@section('subtitle')
    List Check Sheet
@endsection
@section('menuUtama')
    Menu Utama
@endsection
@section('menuItem')
    Check Sheet
@endsection

@section('content')

    <div class="content d-flex flex-column flex-column-fluid" id="kt_content">

        @include('partials.toolbar')

        <div class="post d-flex flex-column-fluid" id="kt_post">
            <div id="kt_content_container" class="container-xxl">
                <div class="d-flex align-items-center justify-content-between mb-6">
                    <div>
                        <h1 class="fs-2 fw-bold text-gray-900 mb-1">Check Sheet Templates</h1>
                        <span class="text-muted fs-6">Kelola template check sheet untuk pelaksanaan PM</span>
                    </div>
                    <a href="{{ route('admin.check-sheet.template.create') }}" class="btn btn-primary">
                        <i class="bi bi-plus-circle me-2"></i>Buat Template Baru
                    </a>
                </div>

                @if (session('success'))
                    <div class="alert alert-success d-flex align-items-center mb-5">
                        <i class="bi bi-check-circle me-3 fs-4"></i>
                        <div>{{ session('success') }}</div>
                    </div>
                @endif
                @if (session('error'))
                    <div class="alert alert-danger d-flex align-items-center mb-5">
                        <i class="bi bi-x-circle me-3 fs-4"></i>
                        <div>{{ session('error') }}</div>
                    </div>
                @endif

                {{-- Stat Cards --}}
                <div class="row g-4 mb-6">
                    @foreach ([['label' => 'Total Template', 'value' => $stats->total ?? 0, 'icon' => 'bi-file-earmark-check', 'color' => 'primary'], ['label' => 'Aktif', 'value' => $stats->active ?? 0, 'icon' => 'bi-toggle-on', 'color' => 'success'], ['label' => 'Cycle 6 Bulan', 'value' => $stats->cycle_6m ?? 0, 'icon' => 'bi-calendar2-half', 'color' => 'info'], ['label' => 'Cycle 1 Tahun', 'value' => $stats->cycle_1y ?? 0, 'icon' => 'bi-calendar2', 'color' => 'warning'], ['label' => 'Cycle 2 Tahun', 'value' => $stats->cycle_2y ?? 0, 'icon' => 'bi-calendar2-range', 'color' => 'danger']] as $sc)
                        <div class="col-6 col-lg">
                            <div class="card card-flush border-0 shadow-sm h-100">
                                <div class="card-body d-flex align-items-center gap-3 p-5">
                                    <div class="symbol symbol-45px">
                                        <div class="symbol-label bg-light-{{ $sc['color'] }}">
                                            <i class="bi {{ $sc['icon'] }} fs-3 text-{{ $sc['color'] }}"></i>
                                        </div>
                                    </div>
                                    <div>
                                        <div class="fs-2 fw-bold text-gray-900">{{ number_format($sc['value']) }}</div>
                                        <div class="fs-7 text-muted">{{ $sc['label'] }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    @endforeach
                </div>

                {{-- Filter + Table --}}
                <div class="card card-flush border-0 shadow-sm">
                    <div class="card-header border-0 pt-6 flex-wrap gap-3">
                        <div class="card-title flex-wrap gap-2">
                            <form method="GET" class="d-flex gap-2 flex-wrap align-items-center">
                                <div class="input-group input-group-sm" style="width:220px">
                                    <span class="input-group-text border-0 bg-light">
                                        <i class="bi bi-search text-muted"></i>
                                    </span>
                                    <input type="text" name="search" class="form-control border-0 bg-light"
                                        placeholder="Cari nama, doc number, equipment..." value="{{ $search }}">
                                </div>
                                <select name="filter_cycle" class="form-select form-select-sm w-auto"
                                    onchange="this.form.submit()">
                                    <option value="all" @selected(!$filterCycle || $filterCycle === 'all')>Semua Cycle</option>
                                    <option value="6M" @selected($filterCycle === '6M')>6 Bulan</option>
                                    <option value="1Y" @selected($filterCycle === '1Y')>1 Tahun</option>
                                    <option value="2Y" @selected($filterCycle === '2Y')>2 Tahun</option>
                                </select>
                                <select name="filter_equipment" class="form-select form-select-sm w-auto"
                                    onchange="this.form.submit()">
                                    <option value="">Semua Equipment</option>
                                    @foreach ($equipmentList as $eq)
                                        <option value="{{ $eq->id }}" @selected($filterEquip == $eq->id)>
                                            {{ $eq->equipment_code }} — {{ $eq->equipment_name }}
                                        </option>
                                    @endforeach
                                </select>
                                <button type="submit" class="btn btn-sm btn-primary">
                                    <i class="bi bi-search"></i>
                                </button>
                                @if ($search || ($filterCycle && $filterCycle !== 'all') || $filterEquip)
                                    <a href="{{ route('admin.check-sheet.template.index') }}"
                                        class="btn btn-sm btn-light-danger">
                                        <i class="bi bi-x-circle me-1"></i>Reset
                                    </a>
                                @endif
                            </form>
                        </div>
                        <div class="card-toolbar">
                            <a href="{{ route('admin.check-sheet.template.create') }}"
                                class="btn btn-sm btn-light-primary">
                                <i class="bi bi-plus me-1"></i>Buat Template
                            </a>
                        </div>
                    </div>

                    <div class="card-body pt-0">
                        @if ($templates->isEmpty())
                            <div class="text-center py-12">
                                <i class="bi bi-file-earmark-x fs-1 text-muted mb-3 d-block"></i>
                                <p class="text-muted mb-3">Belum ada template check sheet.</p>
                                <a href="{{ route('admin.check-sheet.template.create') }}" class="btn btn-primary">
                                    <i class="bi bi-plus me-1"></i>Buat Template Pertama
                                </a>
                            </div>
                        @else
                            <div class="table-responsive">
                                <table class="table table-row-dashed table-row-gray-200 align-middle gs-0 gy-3">
                                    <thead>
                                        <tr class="fw-bold text-muted fs-7 text-uppercase">
                                            <th class="ps-4">Template</th>
                                            <th>Equipment</th>
                                            <th>PM Cycle</th>
                                            <th class="text-center">Items</th>
                                            <th class="text-center">Status</th>
                                            <th>Dibuat</th>
                                            <th class="text-end pe-4">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach ($templates as $tpl)
                                            <tr>
                                                <td class="ps-4">
                                                    <a href="{{ route('admin.check-sheet.template.show', $tpl->id) }}"
                                                        class="fw-bold text-gray-800 text-hover-primary d-block">
                                                        {{ $tpl->template_name }}
                                                    </a>
                                                    <span class="text-muted fs-8">
                                                        <i class="bi bi-hash"></i>{{ $tpl->doc_number }}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div class="fw-semibold text-gray-700">{{ $tpl->equipment_name }}</div>
                                                    <div class="text-muted fs-8">{{ $tpl->equipment_code }}
                                                        @if ($tpl->etm_group)
                                                            · {{ $tpl->etm_group }}
                                                        @endif
                                                    </div>
                                                </td>
                                                <td>
                                                    @php
                                                        $cycleColor =
                                                            ['6M' => 'info', '1Y' => 'primary', '2Y' => 'warning'][
                                                                $tpl->pm_cycle
                                                            ] ?? 'secondary';
                                                    @endphp
                                                    <span class="badge badge-light-{{ $cycleColor }} fw-semibold px-3">
                                                        {{ $tpl->pm_cycle }}
                                                    </span>
                                                </td>
                                                <td class="text-center">
                                                    <span class="fw-bold text-gray-800">{{ $tpl->item_count }}</span>
                                                    <span class="text-muted fs-8"> item</span>
                                                </td>
                                                <td class="text-center">
                                                    @if ($tpl->is_active)
                                                        <span class="badge badge-light-success fw-semibold">Aktif</span>
                                                    @else
                                                        <span
                                                            class="badge badge-light-secondary fw-semibold">Nonaktif</span>
                                                    @endif
                                                </td>
                                                <td class="text-muted fs-7">
                                                    {{ $tpl->created_at ? \Carbon\Carbon::parse($tpl->created_at)->format('d M Y') : '—' }}
                                                </td>
                                                <td class="text-end pe-4">
                                                    <div class="d-flex justify-content-end gap-1">
                                                        <a href="{{ route('admin.check-sheet.template.show', $tpl->id) }}"
                                                            class="btn btn-sm btn-light-primary py-1 px-3">
                                                            <i class="bi bi-eye me-1"></i>Detail
                                                        </a>
                                                        <a href="{{ route('admin.check-sheet.template.edit', $tpl->id) }}"
                                                            class="btn btn-sm btn-light-warning py-1 px-3">
                                                            <i class="bi bi-pencil me-1"></i>Edit
                                                        </a>
                                                        <div class="dropdown">
                                                            <button class="btn btn-sm btn-light py-1 px-2"
                                                                data-bs-toggle="dropdown">
                                                                <i class="bi bi-three-dots-vertical"></i>
                                                            </button>
                                                            <ul class="dropdown-menu dropdown-menu-end">
                                                                <li>
                                                                    <form method="POST"
                                                                        action="{{ route('admin.check-sheet.template.toggle', $tpl->id) }}">
                                                                        @csrf @method('PATCH')
                                                                        <button type="submit" class="dropdown-item">
                                                                            <i
                                                                                class="bi bi-toggle-{{ $tpl->is_active ? 'off' : 'on' }} me-2"></i>
                                                                            {{ $tpl->is_active ? 'Nonaktifkan' : 'Aktifkan' }}
                                                                        </button>
                                                                    </form>
                                                                </li>
                                                                <li>
                                                                    <hr class="dropdown-divider">
                                                                </li>
                                                                <li>
                                                                    <form method="POST"
                                                                        action="{{ route('admin.check-sheet.template.destroy', $tpl->id) }}"
                                                                        onsubmit="return confirm('Hapus template ini? Tindakan tidak dapat dibatalkan.')">
                                                                        @csrf @method('DELETE')
                                                                        <button type="submit"
                                                                            class="dropdown-item text-danger">
                                                                            <i class="bi bi-trash me-2"></i>Hapus
                                                                        </button>
                                                                    </form>
                                                                </li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>

                            <div class="d-flex justify-content-between align-items-center mt-4">
                                <div class="text-muted fs-7">
                                    Menampilkan {{ $templates->firstItem() }}–{{ $templates->lastItem() }}
                                    dari {{ $templates->total() }} template
                                </div>
                                {{ $templates->links() }}
                            </div>
                        @endif
                    </div>
                </div>
            </div>
        </div>
    </div>


@endsection
