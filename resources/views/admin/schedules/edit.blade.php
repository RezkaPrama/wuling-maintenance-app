@extends('layouts.app')

@section('title') Jadwal PM @endsection
@section('subtitle') Edit Jadwal PM @endsection
@section('menuUtama') Menu Utama @endsection
@section('menuItem') Schedule PM @endsection

@section('styles')
<style>
    .section-title {
        font-size: .7rem; font-weight: 700; letter-spacing: .1em;
        text-transform: uppercase; color: var(--bs-gray-500);
        padding-bottom: 6px; border-bottom: 1px solid var(--bs-gray-200);
        margin-bottom: 18px;
    }
    .cycle-card {
        border: 2px solid var(--bs-gray-200); border-radius: 10px;
        padding: 14px 16px; cursor: pointer;
        transition: border-color .2s, background .2s;
    }
    .cycle-card:hover, .cycle-card.selected {
        border-color: var(--bs-primary); background: rgba(0,158,247,.05);
    }
    .cycle-card input[type=radio] { display: none; }
</style>
@endsection

@section('content')
<div class="content d-flex flex-column flex-column-fluid" id="kt_content">
    @include('partials.toolbar')
    <div class="post d-flex flex-column-fluid" id="kt_post">
        <div id="kt_content_container" class="container-xxl">

            {{-- Header ─────────────────────────────────────────────────── --}}
            <div class="d-flex align-items-center justify-content-between mb-6">
                <div>
                    <h1 class="page-heading fw-bold fs-3 text-gray-900 my-0">
                        Edit Jadwal PM — <span class="text-primary">{{ $schedule->pm_cycle }}</span>
                    </h1>
                    <ul class="breadcrumb breadcrumb-separatorless fw-semibold fs-7 mt-1">
                        <li class="breadcrumb-item text-muted">
                            <a href="{{ route('admin.schedules.index') }}" class="text-muted text-hover-primary">Jadwal PM</a>
                        </li>
                        <li class="breadcrumb-item"><span class="bullet bg-gray-500 w-5px h-2px"></span></li>
                        <li class="breadcrumb-item text-muted">
                            <a href="{{ route('admin.schedules.show', $schedule->id) }}" class="text-muted text-hover-primary">
                                {{ $schedule->equipment_name }}
                            </a>
                        </li>
                        <li class="breadcrumb-item"><span class="bullet bg-gray-500 w-5px h-2px"></span></li>
                        <li class="breadcrumb-item text-muted">Edit</li>
                    </ul>
                </div>
                <a href="{{ route('admin.schedules.show', $schedule->id) }}" class="btn btn-light btn-sm">
                    <i class="bi bi-arrow-left me-1"></i>Kembali
                </a>
            </div>

            @if($errors->any())
            <div class="alert alert-danger d-flex align-items-center p-4 mb-5">
                <i class="bi bi-x-circle fs-2 text-danger me-3 flex-shrink-0"></i>
                <div>
                    <div class="fw-bold mb-1">Terdapat kesalahan:</div>
                    <ul class="mb-0 ps-3">
                        @foreach($errors->all() as $e) <li class="fs-7">{{ $e }}</li> @endforeach
                    </ul>
                </div>
            </div>
            @endif

            <form action="{{ route('admin.schedules.update', $schedule->id) }}" method="POST" id="schedule-form">
                @csrf
                @method('PUT')

                <div class="row g-5">
                    {{-- ── Kolom Kiri ─────────────────────────────────── --}}
                    <div class="col-lg-8">
                        <div class="card shadow-sm">
                            <div class="card-body p-8">

                                {{-- Info equipment (read-only, tidak bisa diubah) --}}
                                <div class="section-title">Equipment</div>
                                <div class="alert alert-light d-flex align-items-center py-4 mb-6">
                                    <div class="symbol symbol-40px me-4">
                                        <span class="symbol-label bg-light-primary">
                                            <i class="bi bi-cpu fs-3 text-primary"></i>
                                        </span>
                                    </div>
                                    <div class="flex-grow-1">
                                        <div class="fw-bold text-gray-900 fs-6">{{ $schedule->equipment_name }}</div>
                                        <div class="text-muted fs-8">
                                            {{ $schedule->equipment_code }}
                                            @if($schedule->etm_group) · {{ $schedule->etm_group }} @endif
                                            @if($schedule->location) · {{ $schedule->location }} @endif
                                        </div>
                                    </div>
                                    <span class="badge badge-light-success fw-bold">
                                        <i class="bi bi-lock me-1"></i>Tidak dapat diubah
                                    </span>
                                </div>

                                {{-- PM Cycle ─────────────────────────────── --}}
                                <div class="section-title">PM Cycle</div>
                                <div class="row g-3 mb-6">
                                    @foreach(['6M'=>['6 Bulan','bi-calendar-month'],'1Y'=>['1 Tahun','bi-calendar-year'],'2Y'=>['2 Tahun','bi-calendar3']] as $val=>[$label,$icon])
                                    @php $selected = old('pm_cycle', $schedule->pm_cycle) === $val; @endphp
                                    <div class="col-md-4">
                                        <label class="cycle-card d-block {{ $selected ? 'selected' : '' }}"
                                               id="cycle-label-{{ $val }}">
                                            <input type="radio" name="pm_cycle" value="{{ $val }}"
                                                   {{ $selected ? 'checked' : '' }}
                                                   onchange="onCycleChange('{{ $val }}')">
                                            <div class="d-flex align-items-center gap-3">
                                                <i class="bi {{ $icon }} fs-2 text-primary"></i>
                                                <div class="fw-bold text-gray-900">{{ $label }}</div>
                                            </div>
                                        </label>
                                    </div>
                                    @endforeach
                                </div>
                                @error('pm_cycle')
                                <div class="text-danger fs-8 mb-3">{{ $message }}</div>
                                @enderror

                                {{-- Tanggal ──────────────────────────────── --}}
                                <div class="section-title mt-2">Tanggal Jadwal</div>
                                <div class="row g-5 mb-5">
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold required">Next Maintenance</label>
                                        <input type="date" name="next_maintenance"
                                               class="form-control form-control-solid @error('next_maintenance') is-invalid @enderror"
                                               value="{{ old('next_maintenance', $schedule->next_maintenance) }}"
                                               required onchange="previewStatus()">
                                        @error('next_maintenance')
                                        <div class="invalid-feedback">{{ $message }}</div>
                                        @enderror
                                        <div id="status-preview" class="mt-2">
                                            <span class="fs-8 text-muted">Status akan diset ke: </span>
                                            <span id="status-preview-badge" class="badge fs-9 fw-bold"></span>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold">Last Maintenance</label>
                                        <input type="date" name="last_maintenance"
                                               class="form-control form-control-solid @error('last_maintenance') is-invalid @enderror"
                                               value="{{ old('last_maintenance', $schedule->last_maintenance) }}">
                                        @error('last_maintenance')
                                        <div class="invalid-feedback">{{ $message }}</div>
                                        @enderror
                                    </div>
                                </div>

                                {{-- Status manual override ────────────────── --}}
                                <div class="section-title mt-2">Override Status</div>
                                <div class="form-text text-muted fs-8 mb-3">
                                    Status dihitung otomatis dari next maintenance. Override hanya jika diperlukan.
                                </div>
                                <div class="d-flex flex-wrap gap-3 mb-5">
                                    @foreach(['pending'=>['Pending','info'],'due'=>['Due','warning'],'overdue'=>['Overdue','danger'],'completed'=>['Completed','success']] as $val=>[$lbl,$color])
                                    <label class="d-flex align-items-center gap-2 p-3 border rounded cursor-pointer
                                           {{ old('status',$schedule->status)===$val ? 'border-'.$color.' bg-light-'.$color : 'border-gray-200' }}"
                                           id="status-label-{{ $val }}" style="cursor:pointer;">
                                        <input type="radio" name="status" value="{{ $val }}"
                                               class="form-check-input mt-0"
                                               {{ old('status',$schedule->status)===$val?'checked':'' }}
                                               onchange="updateStatusLabel()">
                                        <span class="fw-bold text-{{ $color }} fs-7">{{ $lbl }}</span>
                                    </label>
                                    @endforeach
                                </div>
                                @error('status')
                                <div class="text-danger fs-8 mb-3">{{ $message }}</div>
                                @enderror

                                {{-- Interval ─────────────────────────────── --}}
                                <div class="section-title mt-2">Interval</div>
                                <div class="row g-5">
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold">Interval (Hari)</label>
                                        <div class="input-group input-group-solid">
                                            <input type="number" name="interval_days" id="interval-days"
                                                   class="form-control form-control-solid"
                                                   value="{{ old('interval_days', $schedule->interval_days) }}"
                                                   min="1" max="9999">
                                            <span class="input-group-text border-0 bg-light text-muted">hari</span>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold">Interval (Jam Operasi)</label>
                                        <div class="input-group input-group-solid">
                                            <input type="number" name="interval_hours"
                                                   class="form-control form-control-solid"
                                                   value="{{ old('interval_hours', $schedule->interval_hours) }}"
                                                   min="1" max="99999">
                                            <span class="input-group-text border-0 bg-light text-muted">jam</span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    {{-- ── Kolom Kanan ─────────────────────────────────── --}}
                    <div class="col-lg-4">
                        <div class="card shadow-sm mb-5">
                            <div class="card-body p-5">
                                <div class="fw-bold text-gray-700 fs-7 mb-3">Data Saat Ini</div>
                                <div class="d-flex flex-column gap-2 fs-8">
                                    @php
                                        $stMap = ['pending'=>['badge-light-info','Pending'],'due'=>['badge-light-warning','Due'],'overdue'=>['badge-light-danger','Overdue'],'completed'=>['badge-light-success','Completed']];
                                        [$stCls,$stLbl] = $stMap[$schedule->status] ?? ['badge-light','?'];
                                    @endphp
                                    <div class="d-flex justify-content-between">
                                        <span class="text-muted">Status Sekarang</span>
                                        <span class="badge {{ $stCls }} fw-bold">{{ $stLbl }}</span>
                                    </div>
                                    <div class="d-flex justify-content-between">
                                        <span class="text-muted">PM Cycle</span>
                                        <span class="badge badge-light-primary fw-bold">{{ $schedule->pm_cycle }}</span>
                                    </div>
                                    <div class="d-flex justify-content-between">
                                        <span class="text-muted">Next PM</span>
                                        <span class="fw-semibold {{ $schedule->status==='overdue'?'text-danger':'' }}">
                                            {{ \Carbon\Carbon::parse($schedule->next_maintenance)->format('d M Y') }}
                                        </span>
                                    </div>
                                    <div class="d-flex justify-content-between">
                                        <span class="text-muted">Last PM</span>
                                        <span class="fw-semibold">
                                            {{ $schedule->last_maintenance ? \Carbon\Carbon::parse($schedule->last_maintenance)->format('d M Y') : '—' }}
                                        </span>
                                    </div>
                                    <div class="d-flex justify-content-between">
                                        <span class="text-muted">Interval</span>
                                        <span class="fw-semibold">{{ $schedule->interval_days ? $schedule->interval_days.' hari' : '—' }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="card shadow-sm mb-5">
                            <div class="card-body p-5">
                                <div class="d-flex flex-column gap-3">
                                    <button type="submit" class="btn btn-primary w-100" id="btn-submit">
                                        <i class="bi bi-save me-1"></i>Simpan Perubahan
                                    </button>
                                    <a href="{{ route('admin.schedules.show', $schedule->id) }}"
                                       class="btn btn-light w-100">Batal</a>
                                </div>
                            </div>
                        </div>

                        {{-- Danger zone --}}
                        <div class="card shadow-sm border border-danger border-dashed">
                            <div class="card-body p-5">
                                <div class="text-danger fw-bold fs-7 mb-2">
                                    <i class="bi bi-exclamation-triangle me-1"></i>Danger Zone
                                </div>
                                <p class="text-muted fs-8 mb-3">
                                    Hapus jadwal ini secara permanen. Tidak bisa dilakukan jika sudah ada maintenance record.
                                </p>
                                <button type="button" class="btn btn-sm btn-light-danger w-100"
                                        data-bs-toggle="modal" data-bs-target="#deleteModal">
                                    <i class="bi bi-trash me-1"></i>Hapus Jadwal
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </form>

        </div>
    </div>
</div>

{{-- Modal Hapus ─────────────────────────────────────────────────────────── --}}
<div class="modal fade" id="deleteModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content">
            <div class="modal-header border-0 pb-0">
                <h5 class="modal-title text-danger fw-bold">Hapus Jadwal?</h5>
            </div>
            <div class="modal-body text-center">
                <i class="bi bi-trash3 fs-3x text-danger mb-3 d-block"></i>
                <p class="text-gray-700 fs-7">
                    Jadwal PM <strong>{{ $schedule->pm_cycle }}</strong> untuk
                    <strong>{{ $schedule->equipment_name }}</strong> akan dihapus permanen.
                </p>
            </div>
            <div class="modal-footer border-0 pt-0 justify-content-center gap-3">
                <button type="button" class="btn btn-light btn-sm" data-bs-dismiss="modal">Batal</button>
                <form action="{{ route('admin.schedules.destroy', $schedule->id) }}" method="POST" class="d-inline">
                    @csrf @method('DELETE')
                    <button type="submit" class="btn btn-danger btn-sm">Ya, Hapus</button>
                </form>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
function onCycleChange(val) {
    document.querySelectorAll('.cycle-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('cycle-label-' + val)?.classList.add('selected');
    const map = { '6M': 180, '1Y': 365, '2Y': 730 };
    document.getElementById('interval-days').placeholder = 'Auto (' + map[val] + ')';
}

function previewStatus() {
    const dateVal = document.querySelector('input[name="next_maintenance"]').value;
    if (!dateVal) return;
    const today  = new Date(); today.setHours(0,0,0,0);
    const next   = new Date(dateVal);
    const diff   = Math.round((next - today) / 86400000);
    let status, cls;
    if (diff < 0)      { status = 'Overdue'; cls = 'badge-light-danger'; }
    else if (diff <= 14){ status = 'Due';    cls = 'badge-light-warning'; }
    else               { status = 'Pending'; cls = 'badge-light-info'; }
    const badge = document.getElementById('status-preview-badge');
    badge.className = 'badge fs-9 fw-bold ' + cls;
    badge.textContent = status;

    // Sync radio status ke nilai otomatis
    const radio = document.querySelector(`input[name="status"][value="${status.toLowerCase()}"]`);
    if (radio) { radio.checked = true; updateStatusLabel(); }
}

function updateStatusLabel() {
    const colorMap = { pending:'info', due:'warning', overdue:'danger', completed:'success' };
    document.querySelectorAll('input[name="status"]').forEach(function (r) {
        const lbl   = document.getElementById('status-label-' + r.value);
        const color = colorMap[r.value];
        if (r.checked) {
            lbl.classList.add('border-' + color, 'bg-light-' + color);
            lbl.classList.remove('border-gray-200');
        } else {
            lbl.classList.remove('border-' + color, 'bg-light-' + color);
            lbl.classList.add('border-gray-200');
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    previewStatus();
    document.getElementById('schedule-form').addEventListener('submit', function () {
        const btn = document.getElementById('btn-submit');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Menyimpan...';
    });
});
</script>
@endpush