{{-- resources/views/admin/maintenance/record/show.blade.php --}}
@extends('layouts.app')

@section('title', 'Detail Record — ' . $record->record_number)

@push('styles')
<style>
.item-row-ok      { border-left: 3px solid #50cd89; }
.item-row-ng      { border-left: 3px solid #f1416c; }
.item-row-na      { border-left: 3px solid #b5b5c3; }
.item-row-pending { border-left: 3px solid #e4e6ef; }
.progress-ring { width: 80px; height: 80px; }
.timeline-step { position: relative; padding-left: 32px; margin-bottom: 20px; }
.timeline-step::before { content: ''; position: absolute; left: 10px; top: 20px;
    bottom: -20px; width: 2px; background: #eff2f5; }
.timeline-step:last-child::before { display: none; }
.timeline-dot { position: absolute; left: 0; top: 4px; width: 20px; height: 20px;
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-size: .6rem; }
</style>
@endpush

@section('content')
{{-- ── HEADER ── --}}
<div class="d-flex align-items-start justify-content-between mb-6 flex-wrap gap-3">
    <div class="d-flex align-items-center gap-3">
        <a href="{{ route('admin.records.index') }}" class="btn btn-sm btn-light">
            <i class="bi bi-arrow-left"></i>
        </a>
        <div>
            <h1 class="fs-2 fw-bold text-gray-900 mb-1">{{ $record->record_number }}</h1>
            <div class="text-muted fs-6">
                {{ $record->equipment_name }} ·
                {{ \Carbon\Carbon::parse($record->maintenance_date)->format('d M Y') }}
            </div>
        </div>
    </div>
    <div class="d-flex gap-2 flex-wrap">
        @if($record->status === 'in_progress')
        <a href="{{ route('admin.records.work', $record->id) }}"
           class="btn btn-warning">
            <i class="bi bi-pencil me-1"></i>Lanjut Kerjakan
        </a>
        @endif
        {{-- Tombol cetak/download report bisa ditambahkan di sini --}}
        <a href="{{ route('admin.records.index') }}" class="btn btn-light">
            <i class="bi bi-list me-1"></i>Semua Record
        </a>
    </div>
</div>

@if(session('success'))
<div class="alert alert-success d-flex align-items-center mb-5">
    <i class="bi bi-check-circle me-3 fs-4"></i>
    <div>{{ session('success') }}</div>
</div>
@endif

<div class="row g-5">
    {{-- ── Kolom Kiri: Info + Progress + Items ── --}}
    <div class="col-lg-8">
        {{-- Info Card --}}
        <div class="card card-flush border-0 shadow-sm mb-5">
            <div class="card-body py-5 px-6">
                <div class="row g-4">
                    <div class="col-sm-6">
                        <div class="d-flex gap-3 mb-4">
                            <div class="symbol symbol-50px">
                                <div class="symbol-label bg-light-primary">
                                    <i class="bi bi-cpu fs-3 text-primary"></i>
                                </div>
                            </div>
                            <div>
                                <div class="fw-bold text-gray-800">{{ $record->equipment_name }}</div>
                                <div class="text-muted fs-7">{{ $record->equipment_code }}</div>
                                <div class="text-muted fs-8">{{ $record->location }}</div>
                            </div>
                        </div>
                        <div class="row g-3">
                            <div class="col-6">
                                <div class="text-muted fs-8">Template</div>
                                <div class="fw-semibold fs-7">{{ $record->template_name }}</div>
                            </div>
                            <div class="col-6">
                                <div class="text-muted fs-8">Doc Number</div>
                                <div class="fw-semibold fs-7">{{ $record->doc_number }}</div>
                            </div>
                            <div class="col-6">
                                <div class="text-muted fs-8">PM Cycle</div>
                                <span class="badge badge-light-primary">{{ $record->pm_cycle }}</span>
                            </div>
                            <div class="col-6">
                                <div class="text-muted fs-8">Status</div>
                                @php
                                    $statusMap = [
                                        'in_progress' => ['class' => 'badge-light-warning', 'label' => 'In Progress'],
                                        'completed'   => ['class' => 'badge-light-info',    'label' => 'Menunggu Validasi'],
                                        'validated'   => ['class' => 'badge-light-success', 'label' => 'Validated'],
                                        'rejected'    => ['class' => 'badge-light-danger',  'label' => 'Rejected'],
                                    ];
                                    $st = $statusMap[$record->status] ?? ['class' => 'badge-light', 'label' => $record->status];
                                @endphp
                                <span class="badge {{ $st['class'] }} fw-semibold">{{ $st['label'] }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-sm-6">
                        <div class="row g-3">
                            <div class="col-6">
                                <div class="text-muted fs-8">Tanggal PM</div>
                                <div class="fw-semibold">
                                    {{ \Carbon\Carbon::parse($record->maintenance_date)->format('d M Y') }}
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="text-muted fs-8">Waktu</div>
                                <div class="fw-semibold fs-7">
                                    {{ $record->start_time }}
                                    @if($record->end_time) — {{ $record->end_time }} @endif
                                </div>
                                @if($record->start_time && $record->end_time)
                                @php
                                    $dur = \Carbon\Carbon::parse($record->maintenance_date . ' ' . $record->start_time)
                                        ->diffInMinutes(\Carbon\Carbon::parse($record->maintenance_date . ' ' . $record->end_time));
                                @endphp
                                <div class="text-muted fs-8">{{ $dur }} menit</div>
                                @endif
                            </div>
                            <div class="col-6">
                                <div class="text-muted fs-8">Teknisi</div>
                                <div class="fw-semibold">{{ $record->technician_name }}</div>
                            </div>
                            @if($record->checker_name)
                            <div class="col-6">
                                <div class="text-muted fs-8">Checker</div>
                                <div class="fw-semibold">{{ $record->checker_name }}</div>
                            </div>
                            @endif
                            @if($record->validator_name)
                            <div class="col-12">
                                <div class="text-muted fs-8">Validator</div>
                                <div class="fw-semibold">{{ $record->validator_name }}</div>
                            </div>
                            @endif
                        </div>
                    </div>
                </div>
                @if($record->notes)
                <div class="border-top mt-4 pt-4">
                    <div class="text-muted fs-8 mb-1">Catatan</div>
                    <div class="text-gray-700">{{ $record->notes }}</div>
                </div>
                @endif
            </div>
        </div>

        {{-- Progress Summary --}}
        <div class="card card-flush border-0 shadow-sm mb-5">
            <div class="card-body py-5 px-6">
                <div class="row align-items-center">
                    <div class="col-auto">
                        <div class="position-relative d-inline-flex align-items-center justify-content-center"
                             style="width:80px;height:80px;">
                            <svg viewBox="0 0 36 36" class="position-absolute" style="width:80px;height:80px;transform:rotate(-90deg)">
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#eff2f5" stroke-width="3"/>
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#50cd89" stroke-width="3"
                                    stroke-dasharray="{{ $progress['percent'] }} {{ 100 - $progress['percent'] }}"
                                    stroke-linecap="round"/>
                            </svg>
                            <span class="fw-bold fs-5 text-gray-800 position-relative">
                                {{ $progress['percent'] }}%
                            </span>
                        </div>
                    </div>
                    <div class="col">
                        <div class="row g-3">
                            <div class="col-4 text-center">
                                <div class="fs-2 fw-bold text-success">{{ $progress['ok'] }}</div>
                                <div class="text-muted fs-8">OK</div>
                            </div>
                            <div class="col-4 text-center">
                                <div class="fs-2 fw-bold text-danger">{{ $progress['ng'] }}</div>
                                <div class="text-muted fs-8">Not Good</div>
                            </div>
                            <div class="col-4 text-center">
                                <div class="fs-2 fw-bold text-muted">{{ $progress['pending'] }}</div>
                                <div class="text-muted fs-8">Pending</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-auto text-end">
                        <div class="fs-4 fw-bold text-gray-800">{{ $progress['done'] }}/{{ $progress['total'] }}</div>
                        <div class="text-muted fs-8">item selesai</div>
                    </div>
                </div>
            </div>
        </div>

        {{-- Check Items Table --}}
        <div class="card card-flush border-0 shadow-sm">
            <div class="card-header border-0 pt-5">
                <h3 class="card-title fw-bold fs-5">
                    <i class="bi bi-list-check me-2 text-primary"></i>
                    Detail Check Sheet Items
                </h3>
            </div>
            <div class="card-body pt-0">
                @php $lastSubEq = null; @endphp
                @foreach($items as $item)
                    @if($item->sub_equipment !== $lastSubEq)
                        @if($lastSubEq !== null) <div class="mb-4"></div> @endif
                        <div class="fw-bold text-muted fs-8 text-uppercase letter-spacing-1 mb-2 mt-4
                            {{ $loop->first ? 'mt-0' : '' }}">
                            <i class="bi bi-gear me-1"></i>{{ $item->sub_equipment ?: 'General' }}
                        </div>
                        @php $lastSubEq = $item->sub_equipment @endphp
                    @endif

                    <div class="d-flex align-items-start gap-3 p-3 rounded mb-2 item-row-{{ $item->status }}"
                         style="background: #fafafa">
                        <div class="fw-bold text-muted fs-7" style="min-width: 28px;">
                            {{ $item->item_number }}
                        </div>
                        <div class="flex-grow-1">
                            <div class="fw-semibold text-gray-800 fs-7 mb-1">{{ $item->check_item }}</div>
                            <div class="text-muted fs-8">{{ $item->maintenance_standard }}</div>
                            @if($item->remarks)
                            <div class="mt-1 fs-8 text-info">
                                <i class="bi bi-chat-left-text me-1"></i>{{ $item->remarks }}
                            </div>
                            @endif
                            @if($item->requires_action && $item->action_required)
                            <div class="mt-1 fs-8 text-warning">
                                <i class="bi bi-wrench me-1"></i>{{ $item->action_required }}
                            </div>
                            @endif
                            {{-- Foto --}}
                            @if(!empty($item->photos))
                            <div class="d-flex gap-2 mt-2 flex-wrap">
                                @foreach($item->photos as $ph)
                                <a href="{{ $ph['url'] }}" target="_blank">
                                    <img src="{{ $ph['url'] }}"
                                         style="width:48px;height:48px;object-fit:cover;border-radius:6px;border:1px solid #eff2f5">
                                </a>
                                @endforeach
                            </div>
                            @endif
                        </div>
                        <div class="text-end">
                            @php
                                $itemStatusMap = [
                                    'ok'      => ['class' => 'badge-light-success', 'label' => 'OK'],
                                    'ng'      => ['class' => 'badge-light-danger',  'label' => 'NG'],
                                    'na'      => ['class' => 'badge-secondary',     'label' => 'N/A'],
                                    'pending' => ['class' => 'badge-light',         'label' => 'Pending'],
                                ];
                                $ist = $itemStatusMap[$item->status] ?? ['class' => 'badge-light', 'label' => $item->status];
                            @endphp
                            <span class="badge {{ $ist['class'] }} fw-semibold px-3">{{ $ist['label'] }}</span>
                        </div>
                    </div>
                @endforeach
            </div>
        </div>
    </div>

    {{-- ── Kolom Kanan: Timeline + Validasi ── --}}
    <div class="col-lg-4">
        {{-- Timeline Status --}}
        <div class="card card-flush border-0 shadow-sm mb-5">
            <div class="card-header border-0 pt-5">
                <h3 class="card-title fw-bold fs-5">
                    <i class="bi bi-diagram-3 me-2 text-primary"></i>Alur Validasi
                </h3>
            </div>
            <div class="card-body pt-3">
                @php
                    $steps = [
                        ['label' => 'Dibuat Teknisi', 'done' => true,
                         'name'  => $record->technician_name,
                         'color' => 'success', 'icon' => 'bi-person-check'],
                        ['label' => 'Pengerjaan Selesai', 'done' => in_array($record->status, ['completed','validated','rejected']),
                         'name'  => null,
                         'color' => in_array($record->status, ['completed','validated','rejected']) ? 'success' : 'secondary',
                         'icon'  => 'bi-clipboard-check'],
                        ['label' => 'Validasi Checker', 'done' => in_array($record->status, ['validated','rejected']),
                         'name'  => $record->checker_name,
                         'color' => $record->status === 'rejected' ? 'danger' : (in_array($record->status, ['validated']) ? 'success' : 'secondary'),
                         'icon'  => 'bi-person-check-fill'],
                        ['label' => 'Final Validated', 'done' => $record->status === 'validated',
                         'name'  => $record->validator_name,
                         'color' => $record->status === 'validated' ? 'success' : 'secondary',
                         'icon'  => 'bi-patch-check-fill'],
                    ];
                @endphp
                @foreach($steps as $step)
                <div class="timeline-step">
                    <div class="timeline-dot bg-{{ $step['done'] ? $step['color'] : 'light' }}
                        {{ $step['done'] ? 'text-white' : 'text-muted' }}">
                        <i class="bi {{ $step['icon'] }}" style="font-size:.55rem"></i>
                    </div>
                    <div class="fw-semibold fs-7 {{ $step['done'] ? 'text-gray-800' : 'text-muted' }}">
                        {{ $step['label'] }}
                    </div>
                    @if($step['name'])
                    <div class="text-muted fs-8">{{ $step['name'] }}</div>
                    @endif
                </div>
                @endforeach
            </div>
        </div>

        {{-- Form Validasi (hanya tampil jika completed) --}}
        @if(in_array($record->status, ['completed', 'validated']))
        <div class="card card-flush border-0 shadow-sm" id="validate">
            <div class="card-header border-0 pt-5 bg-light-primary rounded-top">
                <h3 class="card-title fw-bold fs-5 text-primary">
                    <i class="bi bi-shield-check me-2"></i>
                    {{ $record->status === 'completed' ? 'Validasi Record' : 'Final Validation' }}
                </h3>
            </div>
            <div class="card-body">
                <p class="text-muted fs-7 mb-4">
                    @if($record->status === 'completed')
                        Periksa semua item dan konfirmasi hasil pelaksanaan PM.
                    @else
                        Final approval oleh Validator sebelum record ditutup.
                    @endif
                </p>
                <form method="POST"
                    action="{{ route('admin.records.validate', $record->id) }}">
                    @csrf
                    <div class="mb-4">
                        <label class="form-label fw-semibold">Catatan Validasi</label>
                        <textarea name="notes" rows="3" class="form-control"
                            placeholder="Tambahkan catatan validasi (opsional)..."></textarea>
                    </div>
                    <div class="d-flex gap-2">
                        <button type="submit" name="action" value="validate"
                            class="btn btn-success flex-grow-1"
                            onclick="return confirm('Approve record ini?')">
                            <i class="bi bi-check-circle me-1"></i>Approve
                        </button>
                        <button type="submit" name="action" value="reject"
                            class="btn btn-danger"
                            onclick="return confirm('Tolak dan kembalikan ke teknisi?')">
                            <i class="bi bi-x-circle me-1"></i>Tolak
                        </button>
                    </div>
                </form>
            </div>
        </div>
        @endif

        {{-- NG Items Summary --}}
        @if($items->where('status', 'ng')->count() > 0)
        <div class="card card-flush border-0 shadow-sm mt-5 border-danger" style="border-width: 1px !important;">
            <div class="card-header border-0 pt-5">
                <h3 class="card-title fw-bold fs-6 text-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Item NG ({{ $items->where('status', 'ng')->count() }})
                </h3>
            </div>
            <div class="card-body pt-2">
                @foreach($items->where('status', 'ng') as $ngItem)
                <div class="d-flex align-items-start gap-2 mb-3 pb-3 border-bottom">
                    <span class="badge badge-light-danger mt-1">{{ $ngItem->item_number }}</span>
                    <div>
                        <div class="fw-semibold fs-7">{{ $ngItem->check_item }}</div>
                        @if($ngItem->remarks)
                        <div class="text-muted fs-8">{{ $ngItem->remarks }}</div>
                        @endif
                        @if($ngItem->requires_action && $ngItem->action_required)
                        <div class="text-warning fs-8">
                            <i class="bi bi-wrench me-1"></i>{{ $ngItem->action_required }}
                        </div>
                        @endif
                    </div>
                </div>
                @endforeach
            </div>
        </div>
        @endif
    </div>
</div>
@endsection