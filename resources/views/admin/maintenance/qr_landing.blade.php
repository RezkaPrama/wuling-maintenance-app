@extends('layouts.app')

@section('title') Scan QR PM @endsection
@section('subtitle') Pelaksanaan PM via QR @endsection
@section('menuUtama') Menu Utama @endsection
@section('menuItem') Pelaksanaan PM @endsection

@section('styles')
<style>
    .qr-landing-card {
        max-width: 560px;
        margin: 0 auto;
    }
    .equipment-hero {
        background: linear-gradient(135deg, #009ef7 0%, #0063cc 100%);
        border-radius: 12px 12px 0 0;
        padding: 28px 32px;
        color: white;
    }
    .equipment-hero .equip-code {
        font-size: .8rem;
        font-weight: 700;
        letter-spacing: .12em;
        text-transform: uppercase;
        opacity: .8;
    }
    .equipment-hero h2 { font-size: 1.4rem; font-weight: 700; margin: 6px 0 0; }
    .equipment-hero .meta { opacity: .8; font-size: .8rem; margin-top: 6px; }

    .schedule-option-card {
        border: 2px solid var(--bs-gray-200);
        border-radius: 8px;
        padding: 14px 16px;
        cursor: pointer;
        transition: border-color .2s, background .2s;
        margin-bottom: 10px;
    }
    .schedule-option-card:hover,
    .schedule-option-card.selected {
        border-color: var(--bs-primary);
        background: rgba(0,158,247,.05);
    }
    .schedule-option-card input[type=radio] { display: none; }

    .badge-overdue { background: #f1416c; color: #fff; }
    .badge-due     { background: #ffc700; color: #000; }
    .badge-pending { background: #7239ea; color: #fff; }
</style>
@endsection

@section('content')
<div class="content d-flex flex-column flex-column-fluid" id="kt_content">
    @include('partials.toolbar')
    <div class="post d-flex flex-column-fluid" id="kt_post">
        <div id="kt_content_container" class="container-xxl">

            <div class="qr-landing-card">

                {{-- ── Hero card: info equipment ─────────────────────────── --}}
                <div class="equipment-hero mb-0">
                    <div class="equip-code">
                        <i class="bi bi-qr-code-scan me-1"></i>Scan QR — Equipment
                    </div>
                    <h2>{{ $equipment->equipment_name }}</h2>
                    <div class="meta d-flex flex-wrap gap-3 mt-2">
                        <span><i class="bi bi-tag me-1"></i>{{ $equipment->equipment_code }}</span>
                        <span><i class="bi bi-collection me-1"></i>{{ $equipment->etm_group }}</span>
                        @if($equipment->location)
                        <span><i class="bi bi-geo-alt me-1"></i>{{ $equipment->location }}</span>
                        @endif
                    </div>
                </div>

                {{-- ── Body: pilih jadwal dan buat record ─────────────────── --}}
                <div class="card shadow-sm" style="border-radius: 0 0 12px 12px; border-top: 0;">
                    <div class="card-body p-6">

                        @if($schedules->isEmpty())
                        {{-- Tidak ada jadwal due/overdue ─────────────────── --}}
                        <div class="text-center py-8">
                            <i class="bi bi-calendar-check fs-3x text-success mb-3 d-block"></i>
                            <h5 class="fw-bold text-gray-800">Tidak ada PM yang perlu dikerjakan</h5>
                            <p class="text-muted fs-7">
                                Semua jadwal PM untuk equipment ini masih berstatus pending atau sudah selesai.
                            </p>
                            <a href="{{ route('admin.equipment.show', $equipment->id) }}"
                               class="btn btn-light-primary btn-sm mt-2">
                                <i class="bi bi-eye me-1"></i>Lihat Detail Equipment
                            </a>
                        </div>

                        @else
                        {{-- Ada jadwal yang perlu dikerjakan ─────────────── --}}
                        <div class="fw-bold text-gray-700 mb-4">
                            <i class="bi bi-list-check me-2 text-primary"></i>
                            Pilih Jadwal PM yang akan Dikerjakan
                        </div>

                        <form action="{{ route('admin.records.store') }}" method="POST" id="qr-pm-form">
                            @csrf
                            <input type="hidden" name="maintenance_date" value="{{ now()->format('Y-m-d') }}">
                            <input type="hidden" name="start_time" value="{{ now()->format('H:i') }}">
                            <input type="hidden" name="template_id" id="qr-template-id">

                            @foreach($schedules as $s)
                            @php
                                $st = $s->status ?? 'pending';
                                $badgeCls = match($st) {
                                    'overdue' => 'badge-overdue',
                                    'due'     => 'badge-due',
                                    default   => 'badge-pending',
                                };
                            @endphp
                            <label class="schedule-option-card {{ $loop->first ? 'selected' : '' }}"
                                   data-template="{{ $s->template_id ?? '' }}">
                                <input type="radio" name="schedule_id"
                                       value="{{ $s->id }}"
                                       {{ $loop->first ? 'checked' : '' }}>
                                <div class="d-flex align-items-center justify-content-between">
                                    <div>
                                        <div class="fw-bold text-gray-900 fs-7">PM {{ $s->pm_cycle }}</div>
                                        <div class="text-muted fs-8 mt-1">
                                            Next: {{ $s->next_maintenance ? \Carbon\Carbon::parse($s->next_maintenance)->format('d M Y') : '-' }}
                                        </div>
                                    </div>
                                    <span class="badge {{ $badgeCls }} px-3 py-2 fs-9 fw-bold">{{ ucfirst($st) }}</span>
                                </div>
                            </label>
                            @endforeach

                            {{-- Catatan singkat --}}
                            <div class="mb-4 mt-3">
                                <label class="form-label fw-semibold fs-8">Catatan Awal (opsional)</label>
                                <textarea name="notes" class="form-control form-control-sm" rows="2"
                                          placeholder="Kondisi awal equipment..."></textarea>
                            </div>

                            <div class="d-grid">
                                <button type="submit" class="btn btn-primary" id="btn-qr-submit">
                                    <i class="bi bi-play-circle me-1"></i>Mulai Pelaksanaan PM
                                </button>
                            </div>
                        </form>

                        @endif

                        {{-- Footer link ──────────────────────────────────── --}}
                        <div class="text-center mt-4 pt-3 border-top border-dashed">
                            <a href="{{ route('admin.equipment.show', $equipment->id) }}"
                               class="text-muted fs-8 text-hover-primary">
                                <i class="bi bi-arrow-left me-1"></i>Lihat halaman lengkap equipment
                            </a>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
document.addEventListener('DOMContentLoaded', function () {

    // Set template_id dari schedule yang dipilih pertama kali
    const firstChecked = document.querySelector('input[name="schedule_id"]:checked');
    if (firstChecked) {
        const templateId = firstChecked.closest('.schedule-option-card').dataset.template;
        document.getElementById('qr-template-id').value = templateId;
    }

    // Update template_id saat pilihan schedule berubah
    document.querySelectorAll('.schedule-option-card').forEach(function (card) {
        card.addEventListener('click', function () {
            document.querySelectorAll('.schedule-option-card').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            this.querySelector('input[type=radio]').checked = true;
            document.getElementById('qr-template-id').value = this.dataset.template;
        });
    });

    // Loading state submit
    const form = document.getElementById('qr-pm-form');
    if (form) {
        form.addEventListener('submit', function () {
            const btn = document.getElementById('btn-qr-submit');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Membuat Record...';
        });
    }
});
</script>
@endpush