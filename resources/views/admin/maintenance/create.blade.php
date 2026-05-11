{{-- resources/views/admin/maintenance/record/create.blade.php --}}
@extends('layouts.app')

@section('title', 'Buat Record PM Baru')

@section('content')
<div class="d-flex align-items-center gap-3 mb-6">
    <a href="{{ route('admin.records.index') }}" class="btn btn-sm btn-light">
        <i class="bi bi-arrow-left"></i>
    </a>
    <div>
        <h1 class="fs-2 fw-bold text-gray-900 mb-0">Buat Record PM Baru</h1>
        <span class="text-muted fs-6">Pilih jadwal dan mulai pelaksanaan preventive maintenance</span>
    </div>
</div>

@if(session('error'))
<div class="alert alert-danger d-flex align-items-center mb-5">
    <i class="bi bi-exclamation-triangle me-3 fs-4"></i>
    <div>{{ session('error') }}</div>
</div>
@endif

<form method="POST" action="{{ route('admin.records.store') }}" id="createRecordForm">
    @csrf
    <div class="row g-5">
        {{-- ── Kiri: Pilih Jadwal ── --}}
        <div class="col-lg-5">
            <div class="card card-flush border-0 shadow-sm h-100">
                <div class="card-header border-0 pt-6">
                    <h3 class="card-title fw-bold fs-5">
                        <i class="bi bi-calendar-event me-2 text-primary"></i>
                        Pilih Jadwal PM
                    </h3>
                </div>
                <div class="card-body pt-2">
                    {{-- Informasi jadwal terpilih (dari URL) --}}
                    @if($schedule)
                    <div class="alert alert-light-primary border border-primary border-dashed rounded mb-5">
                        <div class="d-flex align-items-start gap-3">
                            <i class="bi bi-info-circle text-primary fs-4 mt-1"></i>
                            <div>
                                <div class="fw-bold text-gray-800">{{ $schedule->equipment_name }}</div>
                                <div class="text-muted fs-7">{{ $schedule->equipment_code }} · {{ $schedule->etm_group }}</div>
                                <div class="d-flex gap-2 mt-2">
                                    <span class="badge badge-light-primary">{{ $schedule->pm_cycle }}</span>
                                    <span class="badge {{ $schedule->status === 'overdue' ? 'badge-light-danger' : 'badge-light-warning' }}">
                                        {{ ucfirst($schedule->status) }}
                                    </span>
                                </div>
                                <div class="text-muted fs-8 mt-1">
                                    Jadwal: {{ \Carbon\Carbon::parse($schedule->next_maintenance)->format('d M Y') }}
                                </div>
                            </div>
                        </div>
                    </div>
                    <input type="hidden" name="schedule_id" value="{{ $schedule->id }}">
                    @else
                    {{-- Dropdown pilih jadwal --}}
                    <div class="mb-5">
                        <label class="form-label required fw-semibold">Pilih Jadwal (Due/Overdue)</label>
                        <select name="schedule_id" id="scheduleSelect"
                            class="form-select @error('schedule_id') is-invalid @enderror"
                            required>
                            <option value="">— Pilih Jadwal —</option>
                            @foreach($dueSchedules as $ds)
                            <option value="{{ $ds->id }}"
                                data-code="{{ $ds->equipment_code }}"
                                data-cycle="{{ $ds->pm_cycle }}"
                                data-status="{{ $ds->status }}"
                                data-date="{{ \Carbon\Carbon::parse($ds->next_maintenance)->format('d M Y') }}"
                                {{ old('schedule_id') == $ds->id ? 'selected' : '' }}>
                                [{{ strtoupper($ds->status) }}] {{ $ds->equipment_name }}
                                ({{ $ds->pm_cycle }} · {{ \Carbon\Carbon::parse($ds->next_maintenance)->format('d M Y') }})
                            </option>
                            @endforeach
                        </select>
                        @error('schedule_id')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                        @if($dueSchedules->isEmpty())
                            <div class="text-muted fs-7 mt-2">
                                <i class="bi bi-info-circle me-1"></i>
                                Tidak ada jadwal yang due atau overdue saat ini.
                            </div>
                        @endif
                    </div>
                    @endif

                    {{-- Pilih Template --}}
                    <div class="mb-5">
                        <label class="form-label required fw-semibold">Check Sheet Template</label>
                        <select name="template_id" id="templateSelect"
                            class="form-select @error('template_id') is-invalid @enderror" required>
                            <option value="">— Pilih Template —</option>
                            @foreach($templates as $t)
                            <option value="{{ $t->id }}"
                                data-items="{{ DB::table('check_sheet_items')->where('template_id',$t->id)->where('is_active',1)->count() }}"
                                {{ old('template_id') == $t->id ? 'selected' : '' }}>
                                {{ $t->template_name }} ({{ $t->pm_cycle }}) · #{{ $t->doc_number }}
                            </option>
                            @endforeach
                        </select>
                        @error('template_id')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                        <div id="templateInfo" class="text-muted fs-8 mt-1" style="display:none">
                            <i class="bi bi-list-check me-1"></i>
                            <span id="templateItemCount">0</span> item check sheet
                        </div>
                    </div>

                    {{-- Tanggal & Waktu --}}
                    <div class="row g-3">
                        <div class="col-12">
                            <label class="form-label required fw-semibold">Tanggal Pelaksanaan</label>
                            <input type="date" name="maintenance_date"
                                class="form-control @error('maintenance_date') is-invalid @enderror"
                                value="{{ old('maintenance_date', now()->format('Y-m-d')) }}"
                                max="{{ now()->format('Y-m-d') }}" required>
                            @error('maintenance_date')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                        <div class="col-12">
                            <label class="form-label required fw-semibold">Waktu Mulai</label>
                            <input type="time" name="start_time"
                                class="form-control @error('start_time') is-invalid @enderror"
                                value="{{ old('start_time', now()->format('H:i')) }}" required>
                            @error('start_time')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {{-- ── Kanan: Catatan + konfirmasi ── --}}
        <div class="col-lg-7">
            <div class="card card-flush border-0 shadow-sm mb-5">
                <div class="card-header border-0 pt-6">
                    <h3 class="card-title fw-bold fs-5">
                        <i class="bi bi-pencil-square me-2 text-primary"></i>
                        Catatan
                    </h3>
                </div>
                <div class="card-body pt-2">
                    <textarea name="notes" rows="4"
                        class="form-control"
                        placeholder="Catatan tambahan sebelum memulai PM (opsional)..."
                        >{{ old('notes') }}</textarea>
                </div>
            </div>

            {{-- Info Box --}}
            <div class="card card-flush border-0 shadow-sm bg-light-primary mb-5">
                <div class="card-body py-5 px-6">
                    <div class="d-flex gap-3">
                        <i class="bi bi-lightbulb text-primary fs-2 mt-1"></i>
                        <div>
                            <div class="fw-bold text-gray-800 mb-2">Alur Pelaksanaan PM</div>
                            <ol class="text-muted fs-7 ps-3 mb-0">
                                <li class="mb-1">Buat record → sistem generate nomor otomatis</li>
                                <li class="mb-1">Isi setiap item check sheet (OK / NG / NA)</li>
                                <li class="mb-1">Upload foto bukti untuk setiap item</li>
                                <li class="mb-1">Submit → menunggu validasi Checker</li>
                                <li>Checker & Validator approve → selesai</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            {{-- Teknisi info --}}
            <div class="card card-flush border-0 shadow-sm mb-5">
                <div class="card-body py-5 px-6">
                    <div class="d-flex align-items-center gap-3">
                        <div class="symbol symbol-45px">
                            <div class="symbol-label bg-light-success">
                                <i class="bi bi-person-check fs-4 text-success"></i>
                            </div>
                        </div>
                        <div>
                            <div class="fw-bold text-gray-800">{{ Auth::user()->name }}</div>
                            <div class="text-muted fs-7">Teknisi Pelaksana (login saat ini)</div>
                        </div>
                    </div>
                </div>
            </div>

            {{-- Submit --}}
            <div class="d-flex gap-3">
                <button type="submit" class="btn btn-primary flex-grow-1" id="submitBtn">
                    <i class="bi bi-play-fill me-2"></i>
                    Mulai Pelaksanaan PM
                </button>
                <a href="{{ route('admin.records.index') }}" class="btn btn-light">
                    Batal
                </a>
            </div>
        </div>
    </div>
</form>
@endsection

@push('scripts')
<script>
$(document).ready(function () {
    // Tampilkan info jumlah item saat template dipilih
    $('#templateSelect').on('change', function () {
        const opt = $(this).find(':selected');
        const count = opt.data('items');
        if (count !== undefined && count > 0) {
            $('#templateItemCount').text(count);
            $('#templateInfo').show();
        } else {
            $('#templateInfo').hide();
        }
    }).trigger('change');

    // Jika ada dropdown jadwal: reload template saat jadwal dipilih
    $('#scheduleSelect').on('change', function () {
        const scheduleId = $(this).val();
        if (!scheduleId) return;
        // Redirect dengan schedule_id
        window.location.href = '{{ route("admin.records.create") }}?schedule_id=' + scheduleId;
    });

    // Konfirmasi submit
    $('#createRecordForm').on('submit', function () {
        $('#submitBtn').html('<span class="spinner-border spinner-border-sm me-2"></span>Membuat Record...').prop('disabled', true);
    });
});
</script>
@endpush