{{-- resources/views/admin/check-sheet/template/show.blade.php --}}
@extends('layouts.app')

@section('title')
    Check Sheet
@endsection
@section('subtitle', 'Detail Template — ' . $template->template_name)
@section('menuUtama')
    Menu Utama
@endsection
@section('menuItem')
    Check Sheet
@endsection

@push('styles')
    <style>
        .cs-preview-table {
            border-collapse: collapse;
            width: 100%;
            font-size: .77rem;
            min-width: 800px;
        }

        .cs-preview-table th {
            background: #1e3a5f;
            color: #fff;
            padding: 7px 10px;
            border: 1px solid #2d5186;
            font-size: .68rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: .04em;
            white-space: nowrap;
            text-align: center;
        }

        .cs-preview-table th.th-left {
            text-align: left;
        }

        .cs-preview-table td {
            padding: 7px 10px;
            border: 1px solid #e4e6ef;
            vertical-align: middle;
        }

        .cs-preview-table tr.sub-eq-row td {
            background: #eef2ff;
            font-weight: 700;
            color: #3f51b5;
            padding: 5px 12px;
            border-top: 2px solid #c5cae9;
            font-size: .75rem;
        }

        .cs-preview-table tr:not(.sub-eq-row):hover td {
            background: #f8f9ff;
        }

        /* PM Type badge */
        .pm-badge {
            display: inline-block;
            padding: 2px 7px;
            border-radius: 4px;
            font-size: .65rem;
            font-weight: 700;
            margin: 1px;
        }

        /* Info grid */
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }

        @media (max-width:576px) {
            .info-grid {
                grid-template-columns: 1fr;
            }
        }

        .info-item label {
            font-size: .68rem;
            font-weight: 600;
            color: #a1a5b7;
            text-transform: uppercase;
            display: block;
            margin-bottom: 2px;
        }

        .info-item .val {
            font-size: .88rem;
            font-weight: 600;
            color: #181c32;
        }
    </style>
@endpush

@section('content')

    <div class="content d-flex flex-column flex-column-fluid" id="kt_content">

        @include('partials.toolbar')

        <div class="post d-flex flex-column-fluid" id="kt_post">
            <div id="kt_content_container" class="container-xxl">
                {{-- Header --}}
                <div class="d-flex align-items-start justify-content-between mb-6 flex-wrap gap-3">
                    <div class="d-flex align-items-center gap-3">
                        <a href="{{ route('admin.check-sheet.template.index') }}" class="btn btn-sm btn-light">
                            <i class="bi bi-arrow-left"></i>
                        </a>
                        <div>
                            <div class="text-muted fs-8 mb-1">
                                <a href="{{ route('admin.check-sheet.template.index') }}"
                                    class="text-muted text-hover-primary">
                                    Check Sheet Templates
                                </a>
                                <i class="bi bi-chevron-right mx-1" style="font-size:.6rem"></i>
                                Detail
                            </div>
                            <h1 class="fs-2 fw-bold text-gray-900 mb-0">{{ $template->template_name }}</h1>
                            <div class="text-muted fs-6">
                                #{{ $template->doc_number }} ·
                                <span class="badge badge-light-primary ms-1">{{ $template->pm_cycle }}</span>
                                @if (!$template->is_active)
                                    <span class="badge badge-light-secondary ms-1">Nonaktif</span>
                                @endif
                            </div>
                        </div>
                    </div>
                    <div class="d-flex gap-2 flex-wrap">
                        <a href="{{ route('admin.check-sheet.template.edit', $template->id) }}" class="btn btn-warning">
                            <i class="bi bi-pencil me-1"></i>Edit Template
                        </a>
                        <form method="POST" action="{{ route('admin.check-sheet.template.toggle', $template->id) }}">
                            @csrf @method('PATCH')
                            <button type="submit"
                                class="btn {{ $template->is_active ? 'btn-light-secondary' : 'btn-light-success' }}">
                                <i class="bi bi-toggle-{{ $template->is_active ? 'off' : 'on' }} me-1"></i>
                                {{ $template->is_active ? 'Nonaktifkan' : 'Aktifkan' }}
                            </button>
                        </form>
                    </div>
                </div>

                @if (session('success'))
                    <div class="alert alert-success d-flex align-items-center mb-5">
                        <i class="bi bi-check-circle me-3 fs-4"></i>
                        <div>{{ session('success') }}</div>
                    </div>
                @endif

                <div class="row g-5">

                    {{-- ── Kiri: Info + Stats ── --}}
                    <div class="col-lg-4">

                        {{-- Info card --}}
                        <div class="card card-flush border-0 shadow-sm mb-5">
                            <div class="card-header border-0 pt-5">
                                <h3 class="card-title fw-bold fs-6">
                                    <i class="bi bi-info-circle me-2 text-primary"></i>Informasi Template
                                </h3>
                            </div>
                            <div class="card-body pt-2">
                                <div class="info-grid">
                                    <div class="info-item">
                                        <label>Equipment</label>
                                        <div class="val">
                                            <a href="{{ route('admin.equipment.show', $template->equipment_id) }}"
                                                class="text-primary">
                                                {{ $template->equipment_name }}
                                            </a>
                                        </div>
                                    </div>
                                    <div class="info-item">
                                        <label>Kode</label>
                                        <div class="val">{{ $template->equipment_code }}</div>
                                    </div>
                                    <div class="info-item">
                                        <label>ETM Group</label>
                                        <div class="val">{{ $template->etm_group ?: '—' }}</div>
                                    </div>
                                    <div class="info-item">
                                        <label>Lokasi</label>
                                        <div class="val">{{ $template->location ?: '—' }}</div>
                                    </div>
                                    <div class="info-item">
                                        <label>Doc Number</label>
                                        <div class="val">{{ $template->doc_number }}</div>
                                    </div>
                                    <div class="info-item">
                                        <label>PM Cycle</label>
                                        <div class="val">
                                            <span class="badge badge-light-primary">{{ $template->pm_cycle }}</span>
                                        </div>
                                    </div>
                                    <div class="info-item">
                                        <label>Status</label>
                                        <div class="val">
                                            @if ($template->is_active)
                                                <span class="badge badge-light-success">Aktif</span>
                                            @else
                                                <span class="badge badge-light-secondary">Nonaktif</span>
                                            @endif
                                        </div>
                                    </div>
                                    <div class="info-item">
                                        <label>Dipakai di</label>
                                        <div class="val">{{ $usageCount }} record PM</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {{-- Stats --}}
                        <div class="card card-flush border-0 shadow-sm mb-5">
                            <div class="card-header border-0 pt-5">
                                <h3 class="card-title fw-bold fs-6">
                                    <i class="bi bi-bar-chart me-2 text-primary"></i>Ringkasan
                                </h3>
                            </div>
                            <div class="card-body pt-2">
                                <div class="row g-3 text-center">
                                    <div class="col-4">
                                        <div class="fs-2 fw-bold text-primary">{{ $items->where('is_active', 1)->count() }}
                                        </div>
                                        <div class="text-muted fs-8">Total Item</div>
                                    </div>
                                    <div class="col-4">
                                        <div class="fs-2 fw-bold text-success">{{ $totalManPower }}</div>
                                        <div class="text-muted fs-8">Man Power</div>
                                    </div>
                                    <div class="col-4">
                                        <div class="fs-2 fw-bold text-info">{{ $totalTime }}</div>
                                        <div class="text-muted fs-8">Mnt (plan)</div>
                                    </div>
                                </div>
                                <div class="border-top mt-3 pt-3">
                                    <div class="d-flex justify-content-between fs-8 text-muted mb-1">
                                        <span>Sub Equipment / Grup</span>
                                        <span class="fw-bold text-gray-800">{{ $subEquipGroups }}</span>
                                    </div>
                                    <div class="d-flex justify-content-between fs-8 text-muted">
                                        <span>Estimasi total waktu</span>
                                        <span class="fw-bold text-gray-800">
                                            {{ floor($totalTime / 60) > 0 ? floor($totalTime / 60) . 'j ' : '' }}{{ $totalTime % 60 }}mnt
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {{-- PM Types yang dipakai --}}
                        <div class="card card-flush border-0 shadow-sm">
                            <div class="card-header border-0 pt-5">
                                <h3 class="card-title fw-bold fs-6">
                                    <i class="bi bi-tags me-2 text-primary"></i>PM Types Digunakan
                                </h3>
                            </div>
                            <div class="card-body pt-2">
                                @php
                                    $usedTypes = $items
                                        ->where('is_active', 1)
                                        ->flatMap(fn($i) => $i->pm_types)
                                        ->countBy()
                                        ->sortDesc();
                                @endphp
                                @foreach ($usedTypes as $type => $count)
                                    @php
                                        $ptData =
                                            $pmTypes->firstWhere('code', $type) ?? $pmTypes->firstWhere('name', $type);
                                        $color = $ptData->color_code ?? '#6c757d';
                                    @endphp
                                    <div class="d-flex align-items-center justify-content-between mb-2">
                                        <span class="pm-badge"
                                            style="background:{{ $color }}20;color:{{ $color }};border:1px solid {{ $color }}50">
                                            {{ $type }}
                                        </span>
                                        <div class="d-flex align-items-center gap-2">
                                            <div class="progress" style="width:80px;height:6px">
                                                <div class="progress-bar"
                                                    style="width:{{ min(100, ($count / $items->where('is_active', 1)->count()) * 100) }}%;background:{{ $color }}">
                                                </div>
                                            </div>
                                            <span class="text-muted fs-8">{{ $count }} item</span>
                                        </div>
                                    </div>
                                @endforeach
                            </div>
                        </div>
                    </div>

                    {{-- ── Kanan: Preview Tabel Check Sheet ── --}}
                    <div class="col-lg-8">
                        <div class="card card-flush border-0 shadow-sm">
                            <div class="card-header border-0 pt-5">
                                <h3 class="card-title fw-bold fs-5">
                                    <i class="bi bi-table me-2 text-primary"></i>
                                    Preview Check Sheet Items
                                </h3>
                                <div class="card-toolbar">
                                    <a href="{{ route('admin.check-sheet.template.edit', $template->id) }}"
                                        class="btn btn-sm btn-light-warning">
                                        <i class="bi bi-pencil me-1"></i>Edit Items
                                    </a>
                                </div>
                            </div>
                            <div class="card-body pt-0 px-4 pb-4">
                                <div class="table-responsive">
                                    <table class="cs-preview-table">
                                        <thead>
                                            <tr>
                                                <th style="width:32px">#</th>
                                                <th class="th-left" style="min-width:100px">Sub Equip.</th>
                                                <th class="th-left" style="min-width:160px">Check Item</th>
                                                <th class="th-left" style="min-width:160px">Maintenance Standard</th>
                                                <th style="min-width:180px">PM Type</th>
                                                <th style="width:60px">Man<br>Power</th>
                                                <th style="width:60px">Time<br>(mnt)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @php $lastSubEq = '__INIT__'; @endphp
                                            @foreach ($items->where('is_active', 1) as $item)
                                                @if ($item->sub_equipment !== $lastSubEq)
                                                    <tr class="sub-eq-row">
                                                        <td colspan="7">
                                                            <i class="bi bi-gear-fill me-2 text-primary opacity-75"
                                                                style="font-size:.68rem"></i>
                                                            {{ $item->sub_equipment ?: 'General' }}
                                                        </td>
                                                    </tr>
                                                    @php $lastSubEq = $item->sub_equipment; @endphp
                                                @endif

                                                <tr>
                                                    <td class="text-center fw-bold text-muted">{{ $item->item_number }}
                                                    </td>
                                                    <td class="text-muted" style="font-size:.72rem">
                                                        {{ $item->sub_equipment }}</td>
                                                    <td class="fw-semibold">{{ $item->check_item }}</td>
                                                    <td class="text-muted" style="font-size:.72rem;line-height:1.3">
                                                        {{ $item->maintenance_standard }}
                                                    </td>
                                                    <td class="text-center">
                                                        <div class="d-flex flex-wrap gap-1 justify-content-center">
                                                            @foreach ($item->pm_types as $pt)
                                                                @php
                                                                    $ptData =
                                                                        $pmTypes->firstWhere('code', $pt) ??
                                                                        $pmTypes->firstWhere('name', $pt);
                                                                    $color = $ptData->color_code ?? '#6c757d';
                                                                @endphp
                                                                <span class="pm-badge"
                                                                    style="background:{{ $color }}20;color:{{ $color }};border:1px solid {{ $color }}50">
                                                                    {{ $pt }}
                                                                </span>
                                                            @endforeach
                                                        </div>
                                                    </td>
                                                    <td class="text-center fw-semibold">{{ $item->man_power }}</td>
                                                    <td class="text-center fw-semibold">{{ $item->time_minutes }}</td>
                                                </tr>
                                            @endforeach
                                        </tbody>
                                        <tfoot>
                                            <tr style="background:#f5f8fa">
                                                <td colspan="5" class="text-end fw-bold text-muted fs-8 pe-4">TOTAL
                                                </td>
                                                <td class="text-center fw-bold text-primary">{{ $totalManPower }}</td>
                                                <td class="text-center fw-bold text-primary">{{ $totalTime }}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {{-- Danger zone --}}
                        @if ($usageCount === 0)
                            <div class="card card-flush border-0 shadow-sm mt-5 border-danger"
                                style="border-width:1px!important">
                                <div class="card-body py-5 px-6">
                                    <div class="d-flex align-items-start gap-3">
                                        <i class="bi bi-exclamation-octagon text-danger fs-3 mt-1"></i>
                                        <div class="flex-grow-1">
                                            <div class="fw-bold text-danger mb-1">Danger Zone</div>
                                            <div class="text-muted fs-7 mb-3">
                                                Template ini belum digunakan di record PM manapun.
                                                Hapus permanen jika tidak diperlukan.
                                            </div>
                                            <form method="POST"
                                                action="{{ route('admin.check-sheet.template.destroy', $template->id) }}"
                                                onsubmit="return confirm('Hapus template ini secara permanen?')">
                                                @csrf @method('DELETE')
                                                <button type="submit" class="btn btn-sm btn-danger">
                                                    <i class="bi bi-trash me-1"></i>Hapus Template
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        @endif
                    </div>
                </div>
            </div>
        </div>
    </div>


@endsection
