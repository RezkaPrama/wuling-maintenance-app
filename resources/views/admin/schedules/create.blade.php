@extends('layouts.app')

@section('title') Jadwal PM @endsection
@section('subtitle') Tambah Jadwal PM Baru @endsection
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
        border: 2px solid var(--bs-gray-200);
        border-radius: 10px;
        padding: 14px 16px;
        cursor: pointer;
        transition: border-color .2s, background .2s;
    }
    .cycle-card:hover,
    .cycle-card.selected { border-color: var(--bs-primary); background: rgba(0,158,247,.05); }
    .cycle-card input[type=radio] { display: none; }
    .duplicate-warning {
        display: none;
        font-size: .8rem;
    }
</style>
@endsection

@section('content')
<div class="content d-flex flex-column flex-column-fluid" id="kt_content">
    @include('partials.toolbar')
    <div class="post d-flex flex-column-fluid" id="kt_post">
        <div id="kt_content_container" class="container-xxl">

            {{-- Header ───────────────────────────────────────────────────── --}}
            <div class="d-flex align-items-center justify-content-between mb-6">
                <div>
                    <h1 class="page-heading fw-bold fs-3 text-gray-900 my-0">Tambah Jadwal PM Baru</h1>
                    <ul class="breadcrumb breadcrumb-separatorless fw-semibold fs-7 mt-1">
                        <li class="breadcrumb-item text-muted">
                            <a href="{{ route('admin.schedules.index') }}" class="text-muted text-hover-primary">Jadwal PM</a>
                        </li>
                        <li class="breadcrumb-item"><span class="bullet bg-gray-500 w-5px h-2px"></span></li>
                        <li class="breadcrumb-item text-muted">Tambah Baru</li>
                    </ul>
                </div>
                <a href="{{ route('admin.schedules.index') }}" class="btn btn-light btn-sm">
                    <i class="bi bi-arrow-left me-1"></i>Kembali
                </a>
            </div>

            {{-- Error bag ─────────────────────────────────────────────────── --}}
            @if($errors->any())
            <div class="alert alert-danger d-flex align-items-center p-4 mb-5">
                <i class="bi bi-x-circle fs-2 text-danger me-3 flex-shrink-0"></i>
                <div>
                    <div class="fw-bold mb-1">Terdapat kesalahan input:</div>
                    <ul class="mb-0 ps-3">
                        @foreach($errors->all() as $e) <li class="fs-7">{{ $e }}</li> @endforeach
                    </ul>
                </div>
            </div>
            @endif

            <form action="{{ route('admin.schedules.store') }}" method="POST" id="schedule-form">
                @csrf
                <div class="row g-5">

                    {{-- ── Kolom Kiri: Form utama ──────────────────────── --}}
                    <div class="col-lg-8">
                        <div class="card shadow-sm">
                            <div class="card-body p-8">

                                {{-- Equipment ───────────────────────────── --}}
                                <div class="section-title">Pilih Equipment</div>
                                <div class="mb-6">
                                    <label class="form-label fw-bold required">Equipment</label>
                                    <select name="equipment_id" id="equipment-select"
                                            class="form-select form-select-solid @error('equipment_id') is-invalid @enderror"
                                            required onchange="onEquipmentChange()">
                                        <option value="">— Pilih Equipment —</option>
                                        @foreach($equipmentList as $eq)
                                        <option value="{{ $eq->id }}"
                                                data-code="{{ $eq->equipment_code }}"
                                                data-group="{{ $eq->etm_group }}"
                                                data-location="{{ $eq->location }}"
                                                {{ old('equipment_id', $selectedEquipmentId) == $eq->id ? 'selected' : '' }}>
                                            [{{ $eq->equipment_code }}] {{ $eq->equipment_name }}
                                            @if($eq->etm_group) — {{ $eq->etm_group }} @endif
                                        </option>
                                        @endforeach
                                    </select>
                                    @error('equipment_id')
                                    <div class="invalid-feedback">{{ $message }}</div>
                                    @enderror

                                    {{-- Info equipment terpilih --}}
                                    <div id="equipment-info" class="mt-3 p-3 bg-light rounded fs-8 text-muted" style="display:none;">
                                        <i class="bi bi-cpu me-2"></i>
                                        <span id="equipment-info-text"></span>
                                    </div>
                                </div>

                                {{-- PM Cycle ─────────────────────────────── --}}
                                <div class="section-title mt-6">PM Cycle</div>
                                <div class="row g-3 mb-6" id="cycle-container">
                                    @foreach(['6M'=>['6 Bulan','180 hari sekali','bi-calendar-month'],'1Y'=>['1 Tahun','365 hari sekali','bi-calendar-year'],'2Y'=>['2 Tahun','730 hari sekali','bi-calendar3']] as $val=>[$label,$desc,$icon])
                                    <div class="col-md-4">
                                        <label class="cycle-card d-block {{ old('pm_cycle')===$val?'selected':'' }}"
                                               id="cycle-label-{{ $val }}">
                                            <input type="radio" name="pm_cycle" value="{{ $val }}"
                                                   {{ old('pm_cycle')===$val?'checked':'' }}
                                                   onchange="onCycleChange('{{ $val }}')">
                                            <div class="d-flex align-items-center gap-3">
                                                <i class="bi {{ $icon }} fs-2 text-primary"></i>
                                                <div>
                                                    <div class="fw-bold text-gray-900">{{ $label }}</div>
                                                    <div class="text-muted fs-8">{{ $desc }}</div>
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                    @endforeach
                                </div>
                                @error('pm_cycle')
                                <div class="text-danger fs-8 mb-3">{{ $message }}</div>
                                @enderror

                                {{-- Warning duplikasi ───────────────────── --}}
                                <div class="alert alert-warning d-flex align-items-center py-3 mb-4 duplicate-warning" id="dup-warning">
                                    <i class="bi bi-exclamation-triangle me-2 text-warning fs-5"></i>
                                    <div class="fs-8" id="dup-warning-text"></div>
                                </div>

                                {{-- Tanggal ──────────────────────────────── --}}
                                <div class="section-title mt-2">Jadwal Tanggal</div>
                                <div class="row g-5 mb-5">
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold required">Next Maintenance</label>
                                        <input type="date" name="next_maintenance"
                                               class="form-control form-control-solid @error('next_maintenance') is-invalid @enderror"
                                               value="{{ old('next_maintenance') }}"
                                               min="{{ now()->format('Y-m-d') }}"
                                               required onchange="previewStatus()">
                                        @error('next_maintenance')
                                        <div class="invalid-feedback">{{ $message }}</div>
                                        @enderror
                                        {{-- Preview status otomatis --}}
                                        <div id="status-preview" class="mt-2" style="display:none;">
                                            <span class="fs-8 text-muted">Status otomatis: </span>
                                            <span id="status-preview-badge" class="badge fs-9 fw-bold"></span>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold">Last Maintenance</label>
                                        <input type="date" name="last_maintenance"
                                               class="form-control form-control-solid @error('last_maintenance') is-invalid @enderror"
                                               value="{{ old('last_maintenance') }}">
                                        @error('last_maintenance')
                                        <div class="invalid-feedback">{{ $message }}</div>
                                        @enderror
                                        <div class="form-text text-muted fs-8">Kosongkan jika belum pernah dilakukan PM.</div>
                                    </div>
                                </div>

                                {{-- Interval (opsional) ─────────────────── --}}
                                <div class="section-title mt-2">Interval (Opsional)</div>
                                <div class="form-text text-muted fs-8 mb-4">
                                    Jika dikosongkan, interval dihitung otomatis dari PM Cycle.
                                </div>
                                <div class="row g-5">
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold">Interval (Hari)</label>
                                        <div class="input-group input-group-solid">
                                            <input type="number" name="interval_days" id="interval-days"
                                                   class="form-control form-control-solid"
                                                   value="{{ old('interval_days') }}"
                                                   min="1" max="9999" placeholder="Auto">
                                            <span class="input-group-text border-0 bg-light text-muted">hari</span>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold">Interval (Jam Operasi)</label>
                                        <div class="input-group input-group-solid">
                                            <input type="number" name="interval_hours"
                                                   class="form-control form-control-solid"
                                                   value="{{ old('interval_hours') }}"
                                                   min="1" max="99999" placeholder="Opsional">
                                            <span class="input-group-text border-0 bg-light text-muted">jam</span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    {{-- ── Kolom Kanan: Info & Submit ──────────────────── --}}
                    <div class="col-lg-4">
                        {{-- Panduan --}}
                        <div class="card shadow-sm mb-5 border border-primary border-dashed">
                            <div class="card-body p-5">
                                <div class="fw-bold text-primary fs-7 mb-3">
                                    <i class="bi bi-info-circle me-1"></i>Panduan
                                </div>
                                <ul class="text-muted fs-8 mb-0 ps-3">
                                    <li class="mb-2">Setiap equipment boleh memiliki <strong>satu jadwal per PM Cycle</strong> (6M, 1Y, 2Y).</li>
                                    <li class="mb-2">Status jadwal dihitung <strong>otomatis</strong> berdasarkan tanggal Next Maintenance.</li>
                                    <li class="mb-2"><strong>Due</strong>: ≤ 14 hari sebelum jadwal.</li>
                                    <li class="mb-2"><strong>Overdue</strong>: Sudah melewati tanggal jadwal.</li>
                                    <li>Interval hari diisi otomatis jika dikosongkan.</li>
                                </ul>
                            </div>
                        </div>

                        {{-- Ringkasan yang akan dibuat --}}
                        <div class="card shadow-sm mb-5">
                            <div class="card-body p-5">
                                <div class="fw-bold text-gray-700 fs-7 mb-3">Ringkasan Jadwal</div>
                                <div class="d-flex flex-column gap-2 fs-8">
                                    <div class="d-flex justify-content-between">
                                        <span class="text-muted">Equipment</span>
                                        <span class="fw-semibold text-end" id="summary-equipment">—</span>
                                    </div>
                                    <div class="d-flex justify-content-between">
                                        <span class="text-muted">PM Cycle</span>
                                        <span class="fw-semibold" id="summary-cycle">—</span>
                                    </div>
                                    <div class="d-flex justify-content-between">
                                        <span class="text-muted">Next PM</span>
                                        <span class="fw-semibold" id="summary-next">—</span>
                                    </div>
                                    <div class="d-flex justify-content-between">
                                        <span class="text-muted">Status Awal</span>
                                        <span id="summary-status">—</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {{-- Aksi --}}
                        <div class="card shadow-sm">
                            <div class="card-body p-5">
                                <div class="d-flex flex-column gap-3">
                                    <button type="submit" class="btn btn-primary w-100" id="btn-submit">
                                        <i class="bi bi-save me-1"></i>Simpan Jadwal
                                    </button>
                                    <a href="{{ route('admin.schedules.index') }}" class="btn btn-light w-100">Batal</a>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </form>

        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
// Data duplikasi dari server
const existingSchedules = @json($existingSchedules);

// ── Equipment berubah ─────────────────────────────────────────────────────
function onEquipmentChange() {
    const sel    = document.getElementById('equipment-select');
    const opt    = sel.options[sel.selectedIndex];
    const id     = sel.value;
    const infoEl = document.getElementById('equipment-info');

    if (!id) {
        infoEl.style.display = 'none';
        document.getElementById('summary-equipment').textContent = '—';
        return;
    }

    const code     = opt.dataset.code;
    const group    = opt.dataset.group || '-';
    const location = opt.dataset.location || '-';
    const text     = opt.text;

    // Tampilkan info
    infoEl.style.display = '';
    document.getElementById('equipment-info-text').textContent =
        `${code} · ${group} · ${location}`;

    // Update summary
    document.getElementById('summary-equipment').textContent = code;

    // Cek duplikasi dengan cycle yang sedang dipilih
    checkDuplicate(id);
}

// ── Cycle berubah ─────────────────────────────────────────────────────────
function onCycleChange(val) {
    // Update visual
    document.querySelectorAll('.cycle-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('cycle-label-' + val)?.classList.add('selected');

    // Update interval default
    const intervalMap = { '6M': 180, '1Y': 365, '2Y': 730 };
    const inp = document.getElementById('interval-days');
    if (!inp.value || Object.values(intervalMap).includes(parseInt(inp.value))) {
        inp.placeholder = 'Auto (' + intervalMap[val] + ')';
    }

    // Update summary
    document.getElementById('summary-cycle').textContent = val;

    // Cek duplikasi
    const equipId = document.getElementById('equipment-select').value;
    if (equipId) checkDuplicate(equipId, val);
}

// ── Cek duplikasi ─────────────────────────────────────────────────────────
function checkDuplicate(equipId, cycle) {
    cycle = cycle || document.querySelector('input[name="pm_cycle"]:checked')?.value;
    if (!cycle || !equipId) return;

    const existing = existingSchedules[equipId] || [];
    const dup      = existing.find(s => s.pm_cycle === cycle);
    const warning  = document.getElementById('dup-warning');
    const warnText = document.getElementById('dup-warning-text');

    if (dup) {
        warnText.textContent = `Equipment ini sudah memiliki jadwal PM ${cycle} dengan status "${dup.status}". Menyimpan akan membuat jadwal duplikat.`;
        warning.style.display = 'flex';
    } else {
        warning.style.display = 'none';
    }
}

// ── Preview status otomatis ───────────────────────────────────────────────
function previewStatus() {
    const dateVal = document.querySelector('input[name="next_maintenance"]').value;
    if (!dateVal) return;

    const today   = new Date();
    today.setHours(0,0,0,0);
    const next    = new Date(dateVal);
    const diffMs  = next - today;
    const diffDay = Math.round(diffMs / 86400000);

    let status, cls;
    if (diffDay < 0)       { status = 'Overdue'; cls = 'badge-light-danger'; }
    else if (diffDay <= 14){ status = 'Due';      cls = 'badge-light-warning'; }
    else                   { status = 'Pending';  cls = 'badge-light-info'; }

    const badge = document.getElementById('status-preview-badge');
    badge.className = 'badge fs-9 fw-bold ' + cls;
    badge.textContent = status;
    document.getElementById('status-preview').style.display = '';

    // Update summary
    document.getElementById('summary-next').textContent = new Date(dateVal).toLocaleDateString('id-ID', {day:'2-digit',month:'short',year:'numeric'});
    document.getElementById('summary-status').innerHTML = `<span class="badge ${cls} fs-9 fw-bold">${status}</span>`;
}

// ── Init: jika ada pre-selected ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    const sel = document.getElementById('equipment-select');
    if (sel.value) onEquipmentChange();

    const checked = document.querySelector('input[name="pm_cycle"]:checked');
    if (checked) onCycleChange(checked.value);

    const nextInput = document.querySelector('input[name="next_maintenance"]');
    if (nextInput.value) previewStatus();

    // Submit loading
    document.getElementById('schedule-form').addEventListener('submit', function () {
        const btn = document.getElementById('btn-submit');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Menyimpan...';
    });

    // Sync summary dari input tanggal
    nextInput.addEventListener('change', previewStatus);
});
</script>
@endpush