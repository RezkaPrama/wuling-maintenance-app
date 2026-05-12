@extends('layouts.app')

@section('title') Equipment @endsection
@section('subtitle') Tambah Equipment Baru @endsection
@section('menuUtama') Menu Utama @endsection
@section('menuItem') Equipment @endsection

@section('styles')
<style>
    /* ── Spec row drag handle ── */
    .spec-row { transition: background .15s; }
    .spec-row:hover { background: #f9f9f9; }

    /* ── Form section divider ── */
    .section-title {
        font-size: .7rem;
        font-weight: 700;
        letter-spacing: .1em;
        text-transform: uppercase;
        color: var(--bs-gray-500);
        padding-bottom: 6px;
        border-bottom: 1px solid var(--bs-gray-200);
        margin-bottom: 18px;
    }
</style>
@endsection

@section('content')
<div class="content d-flex flex-column flex-column-fluid" id="kt_content">
    @include('partials.toolbar')
    <div class="post d-flex flex-column-fluid" id="kt_post">
        <div id="kt_content_container" class="container-xxl">

            {{-- Breadcrumb / back ─────────────────────────────────────────── --}}
            <div class="d-flex align-items-center justify-content-between mb-6">
                <div>
                    <h1 class="page-heading fw-bold fs-3 text-gray-900 my-0">Tambah Equipment Baru</h1>
                    <ul class="breadcrumb breadcrumb-separatorless fw-semibold fs-7 mt-1">
                        <li class="breadcrumb-item text-muted">
                            <a href="{{ route('admin.equipment.index') }}" class="text-muted text-hover-primary">Equipment</a>
                        </li>
                        <li class="breadcrumb-item"><span class="bullet bg-gray-500 w-5px h-2px"></span></li>
                        <li class="breadcrumb-item text-muted">Tambah Baru</li>
                    </ul>
                </div>
                <a href="{{ route('admin.equipment.index') }}" class="btn btn-light btn-sm">
                    <i class="bi bi-arrow-left me-1"></i>Kembali
                </a>
            </div>

            {{-- Error bag ─────────────────────────────────────────────────── --}}
            @if($errors->any())
            <div class="alert alert-danger d-flex align-items-center p-4 mb-5">
                <i class="bi bi-x-circle fs-2 text-danger me-3"></i>
                <div>
                    <div class="fw-bold mb-1">Terdapat kesalahan input:</div>
                    <ul class="mb-0 ps-3">
                        @foreach($errors->all() as $err)
                        <li class="fs-7">{{ $err }}</li>
                        @endforeach
                    </ul>
                </div>
            </div>
            @endif

            <form action="{{ route('admin.equipment.store') }}" method="POST" id="equipment-form">
                @csrf

                <div class="row g-5">
                    {{-- ── Kolom Kiri: Data Utama ─────────────────────────── --}}
                    <div class="col-lg-8">
                        <div class="card shadow-sm">
                            <div class="card-body p-8">

                                <div class="section-title">Informasi Utama</div>

                                <div class="row g-5 mb-5">
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold required">Kode Equipment</label>
                                        <input type="text" name="equipment_code"
                                               class="form-control form-control-solid @error('equipment_code') is-invalid @enderror"
                                               value="{{ old('equipment_code') }}"
                                               placeholder="Contoh: WLD-001"
                                               style="text-transform:uppercase"
                                               required>
                                        @error('equipment_code')
                                        <div class="invalid-feedback">{{ $message }}</div>
                                        @enderror
                                        <div class="form-text text-muted fs-8">Harus unik, akan dijadikan QR Code ID.</div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold required">Nama Equipment</label>
                                        <input type="text" name="equipment_name"
                                               class="form-control form-control-solid @error('equipment_name') is-invalid @enderror"
                                               value="{{ old('equipment_name') }}"
                                               placeholder="Contoh: Robot Welding Line 1"
                                               required>
                                        @error('equipment_name')
                                        <div class="invalid-feedback">{{ $message }}</div>
                                        @enderror
                                    </div>
                                </div>

                                <div class="row g-5 mb-5">
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold required">PM Number</label>
                                        <input type="text" name="pm_number"
                                               class="form-control form-control-solid @error('pm_number') is-invalid @enderror"
                                               value="{{ old('pm_number') }}"
                                               placeholder="Contoh: PM-2024-001"
                                               required>
                                        @error('pm_number')
                                        <div class="invalid-feedback">{{ $message }}</div>
                                        @enderror
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold">TIS Number</label>
                                        <input type="text" name="tis_number"
                                               class="form-control form-control-solid"
                                               value="{{ old('tis_number') }}"
                                               placeholder="Optional">
                                    </div>
                                </div>

                                <div class="row g-5 mb-5">
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold required">ETM Group</label>
                                        {{-- Combobox: bisa pilih existing atau ketik baru --}}
                                        <input type="text" name="etm_group" list="etm-group-list"
                                               class="form-control form-control-solid @error('etm_group') is-invalid @enderror"
                                               value="{{ old('etm_group') }}"
                                               placeholder="Pilih atau ketik group baru"
                                               required>
                                        <datalist id="etm-group-list">
                                            @foreach($etmGroups as $g)
                                            <option value="{{ $g }}">
                                            @endforeach
                                        </datalist>
                                        @error('etm_group')
                                        <div class="invalid-feedback">{{ $message }}</div>
                                        @enderror
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold">Lokasi</label>
                                        <input type="text" name="location" list="location-list"
                                               class="form-control form-control-solid"
                                               value="{{ old('location') }}"
                                               placeholder="Pilih atau ketik lokasi baru">
                                        <datalist id="location-list">
                                            @foreach($locations as $loc)
                                            <option value="{{ $loc }}">
                                            @endforeach
                                        </datalist>
                                    </div>
                                </div>

                                {{-- Divider ─────────────────────────────────── --}}
                                <div class="section-title mt-6">Spesifikasi Teknis</div>
                                <div class="form-text text-muted fs-8 mb-4">
                                    Tambahkan spesifikasi teknis equipment (opsional). Contoh: Daya, Tegangan, Kapasitas, dll.
                                </div>

                                <div id="spec-container">
                                    {{-- Row spec lama (jika ada validation error / old input) --}}
                                    @if(old('spec_key'))
                                        @foreach(old('spec_key') as $i => $key)
                                        @if(trim($key))
                                        <div class="spec-row d-flex align-items-center gap-3 mb-3">
                                            <input type="text" name="spec_key[]"
                                                   class="form-control form-control-solid form-control-sm"
                                                   placeholder="Parameter (misal: Daya)" value="{{ $key }}">
                                            <input type="text" name="spec_value[]"
                                                   class="form-control form-control-solid form-control-sm"
                                                   placeholder="Nilai (misal: 5.5 kW)" value="{{ old('spec_value')[$i] ?? '' }}">
                                            <button type="button" class="btn btn-sm btn-icon btn-light-danger remove-spec-row">
                                                <i class="bi bi-x-lg"></i>
                                            </button>
                                        </div>
                                        @endif
                                        @endforeach
                                    @endif
                                </div>
                                <button type="button" class="btn btn-sm btn-light-primary mt-1" id="add-spec-row">
                                    <i class="bi bi-plus-lg me-1"></i>Tambah Spesifikasi
                                </button>

                            </div>
                        </div>
                    </div>

                    {{-- ── Kolom Kanan: Status & Submit ──────────────────── --}}
                    <div class="col-lg-4">
                        <div class="card shadow-sm mb-5">
                            <div class="card-body p-6">
                                <div class="section-title">Status Equipment</div>
                                <div class="d-flex flex-column gap-3">
                                    @foreach(['active'=>['Aktif','success'],'maintenance'=>['Maintenance','warning'],'inactive'=>['Tidak Aktif','danger']] as $val=>[$lbl,$color])
                                    <label class="d-flex align-items-center gap-3 p-3 border rounded cursor-pointer
                                           {{ old('status','active')===$val ? 'border-'.$color.' bg-light-'.$color : 'border-gray-200' }}"
                                           style="cursor:pointer;" id="status-label-{{ $val }}">
                                        <input type="radio" name="status" value="{{ $val }}"
                                               class="form-check-input mt-0"
                                               {{ old('status','active')===$val?'checked':'' }}
                                               onchange="updateStatusLabel()">
                                        <div>
                                            <div class="fw-bold text-{{ $color }}">{{ $lbl }}</div>
                                            <div class="text-muted fs-8">
                                                @if($val==='active') Equipment beroperasi normal
                                                @elseif($val==='maintenance') Sedang dalam perbaikan
                                                @else Tidak digunakan / nonaktif
                                                @endif
                                            </div>
                                        </div>
                                    </label>
                                    @endforeach
                                </div>
                            </div>
                        </div>

                        <div class="card shadow-sm">
                            <div class="card-body p-6">
                                <div class="section-title">Aksi</div>
                                <div class="d-flex flex-column gap-3">
                                    <button type="submit" class="btn btn-primary w-100" id="btn-submit">
                                        <i class="bi bi-save me-1"></i>Simpan Equipment
                                    </button>
                                    <a href="{{ route('admin.equipment.index') }}" class="btn btn-light w-100">
                                        Batal
                                    </a>
                                </div>
                                <div class="text-muted fs-8 mt-3">
                                    <i class="bi bi-info-circle me-1"></i>
                                    QR Code akan otomatis dibuat setelah equipment disimpan.
                                </div>
                            </div>
                        </div>
                    </div>

                </div><!-- /row -->
            </form>

        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
// ── Tambah row spesifikasi ────────────────────────────────────────────────
document.getElementById('add-spec-row').addEventListener('click', function () {
    const container = document.getElementById('spec-container');
    const row = document.createElement('div');
    row.className = 'spec-row d-flex align-items-center gap-3 mb-3';
    row.innerHTML = `
        <input type="text" name="spec_key[]"
               class="form-control form-control-solid form-control-sm"
               placeholder="Parameter (misal: Daya)">
        <input type="text" name="spec_value[]"
               class="form-control form-control-solid form-control-sm"
               placeholder="Nilai (misal: 5.5 kW)">
        <button type="button" class="btn btn-sm btn-icon btn-light-danger remove-spec-row">
            <i class="bi bi-x-lg"></i>
        </button>
    `;
    container.appendChild(row);
    row.querySelector('input').focus();
});

// ── Hapus row spesifikasi (event delegation) ──────────────────────────────
document.getElementById('spec-container').addEventListener('click', function (e) {
    const btn = e.target.closest('.remove-spec-row');
    if (btn) btn.closest('.spec-row').remove();
});

// ── Update visual status label ────────────────────────────────────────────
function updateStatusLabel() {
    const colorMap = { active: 'success', maintenance: 'warning', inactive: 'danger' };
    document.querySelectorAll('input[name="status"]').forEach(function (radio) {
        const lbl   = document.getElementById('status-label-' + radio.value);
        const color = colorMap[radio.value];
        if (radio.checked) {
            lbl.classList.add('border-' + color, 'bg-light-' + color);
            lbl.classList.remove('border-gray-200');
        } else {
            lbl.classList.remove('border-' + color, 'bg-light-' + color);
            lbl.classList.add('border-gray-200');
        }
    });
}

// ── Auto uppercase kode ───────────────────────────────────────────────────
document.querySelector('input[name="equipment_code"]').addEventListener('input', function () {
    const pos = this.selectionStart;
    this.value = this.value.toUpperCase();
    this.setSelectionRange(pos, pos);
});

// ── Submit loading state ──────────────────────────────────────────────────
document.getElementById('equipment-form').addEventListener('submit', function () {
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Menyimpan...';
});
</script>
@endpush