{{-- resources/views/admin/maintenance/record/work.blade.php --}}
@extends('layouts.app')

@section('title', 'Pengerjaan PM — ' . $record->record_number)

@section('subtitle')
    List Jadwal Preventive Maintenance Record
@endsection
@section('menuUtama')
    Menu Utama
@endsection
@section('menuItem')
    Maintenance Record
@endsection

@push('styles')
    <style>
        /* ── Sticky header progress ── */
        .work-sticky-bar {
            position: sticky;
            top: 0;
            z-index: 100;
            background: #fff;
            border-bottom: 2px solid #eff2f5;
            padding: 12px 24px;
            margin: -24px -24px 24px -24px;
            display: flex;
            align-items: center;
            gap: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, .06);
        }

        /* ── Check item card ── */
        .check-item-card {
            border: 2px solid #eff2f5;
            border-radius: 10px;
            margin-bottom: 12px;
            transition: all .2s ease;
            background: #fff;
        }

        .check-item-card:hover {
            border-color: #d1d5db;
            box-shadow: 0 2px 8px rgba(0, 0, 0, .08);
        }

        .check-item-card.status-ok {
            border-left: 4px solid #50cd89;
        }

        .check-item-card.status-ng {
            border-left: 4px solid #f1416c;
        }

        .check-item-card.status-na {
            border-left: 4px solid #7e8299;
        }

        .check-item-card.status-pending {
            border-left: 4px solid #e4e6ef;
        }

        /* ── Status buttons ── */
        .status-btn-group .btn {
            min-width: 60px;
            font-size: .78rem;
            font-weight: 600;
            border-radius: 6px;
        }

        .status-btn-group .btn.active-ok {
            background: #50cd89;
            color: #fff;
            border-color: #50cd89;
        }

        .status-btn-group .btn.active-ng {
            background: #f1416c;
            color: #fff;
            border-color: #f1416c;
        }

        .status-btn-group .btn.active-na {
            background: #7e8299;
            color: #fff;
            border-color: #7e8299;
        }

        /* ── Sub-equipment section ── */
        .sub-equipment-header {
            background: linear-gradient(135deg, #f5f8ff 0%, #eef2ff 100%);
            border-radius: 8px;
            padding: 10px 16px;
            margin-bottom: 12px;
            border-left: 4px solid #6366f1;
        }

        /* ── Photo thumbnails ── */
        .photo-thumb {
            width: 64px;
            height: 64px;
            object-fit: cover;
            border-radius: 6px;
            cursor: pointer;
            border: 2px solid #eff2f5;
            transition: border-color .2s;
        }

        .photo-thumb:hover {
            border-color: #6366f1;
        }

        /* ── Progress bar ── */
        .progress-work {
            height: 8px;
            border-radius: 999px;
            overflow: hidden;
            background: #f5f8fa;
        }

        .progress-work .progress-bar {
            border-radius: 999px;
            transition: width .5s ease;
        }

        /* ── Saving indicator ── */
        .save-indicator {
            font-size: .75rem;
        }

        .save-indicator.saving {
            color: #f6a723;
        }

        .save-indicator.saved {
            color: #50cd89;
        }

        .save-indicator.error {
            color: #f1416c;
        }

        /* ── Item number badge ── */
        .item-num-badge {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #f5f8fa;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: .75rem;
            font-weight: 700;
            color: #5e6278;
            flex-shrink: 0;
        }
    </style>
@endpush

@section('content')

    <div class="content d-flex flex-column flex-column-fluid" id="kt_content">

        @include('partials.toolbar')

        <div class="post d-flex flex-column-fluid" id="kt_post">
            <div id="kt_content_container" class="container-xxl">
                {{-- ── STICKY PROGRESS BAR ── --}}
                <div class="work-sticky-bar" id="stickyBar">
                    <div class="d-flex align-items-center gap-3 flex-grow-1">
                        <div>
                            <div class="fw-bold text-gray-800 fs-6">{{ $record->record_number }}</div>
                            <div class="text-muted fs-8">{{ $record->equipment_name }} · {{ $record->pm_cycle }}</div>
                        </div>
                        <div class="flex-grow-1 d-none d-md-block">
                            <div class="d-flex justify-content-between fs-8 text-muted mb-1">
                                <span>Progress</span>
                                <span id="progressText">{{ $progress['done'] }}/{{ $progress['total'] }} item</span>
                            </div>
                            <div class="progress-work">
                                <div class="progress-bar bg-success" id="progressBar"
                                    style="width: {{ $progress['percent'] }}%"></div>
                            </div>
                        </div>
                        <div class="d-flex align-items-center gap-2 ms-auto">
                            <span class="save-indicator" id="saveIndicator"></span>
                            <span class="badge badge-light-success fs-8" id="progressPercent">
                                {{ $progress['percent'] }}%
                            </span>
                        </div>
                    </div>
                    <div class="d-flex gap-2">
                        <a href="{{ route('admin.records.show', $record->id) }}" class="btn btn-sm btn-light">
                            <i class="bi bi-eye me-1"></i>Preview
                        </a>
                        <button type="button" class="btn btn-sm btn-primary" id="btnComplete"
                            {{ $progress['percent'] < 100 ? 'disabled' : '' }} onclick="submitComplete()">
                            <i class="bi bi-check-circle me-1"></i>Selesaikan PM
                        </button>
                    </div>
                </div>

                {{-- ── RECORD INFO ── --}}
                <div class="row g-4 mb-5">
                    <div class="col-md-8">
                        <div class="card card-flush border-0 shadow-sm">
                            <div class="card-body py-4 px-5">
                                <div class="row g-3">
                                    <div class="col-sm-4">
                                        <div class="text-muted fs-8 mb-1">Equipment</div>
                                        <div class="fw-bold">{{ $record->equipment_name }}</div>
                                        <div class="text-muted fs-8">{{ $record->equipment_code }}</div>
                                    </div>
                                    <div class="col-sm-3">
                                        <div class="text-muted fs-8 mb-1">Template</div>
                                        <div class="fw-semibold">{{ $record->template_name }}</div>
                                        <span class="badge badge-light-primary">{{ $record->pm_cycle }}</span>
                                    </div>
                                    <div class="col-sm-2">
                                        <div class="text-muted fs-8 mb-1">Tanggal</div>
                                        <div class="fw-semibold">
                                            {{ \Carbon\Carbon::parse($record->maintenance_date)->format('d M Y') }}
                                        </div>
                                    </div>
                                    <div class="col-sm-3">
                                        <div class="text-muted fs-8 mb-1">Teknisi</div>
                                        <div class="fw-semibold">{{ $record->technician_name }}</div>
                                        <div class="text-muted fs-8">Mulai: {{ $record->start_time }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card card-flush border-0 shadow-sm h-100">
                            <div class="card-body py-4 px-5 d-flex flex-column justify-content-center">
                                <div class="row g-2 text-center">
                                    <div class="col-4">
                                        <div class="fs-3 fw-bold text-success" id="statOk">{{ $progress['ok'] }}</div>
                                        <div class="text-muted fs-8">OK</div>
                                    </div>
                                    <div class="col-4">
                                        <div class="fs-3 fw-bold text-danger" id="statNg">{{ $progress['ng'] }}</div>
                                        <div class="text-muted fs-8">NG</div>
                                    </div>
                                    <div class="col-4">
                                        <div class="fs-3 fw-bold text-muted" id="statPending">{{ $progress['pending'] }}
                                        </div>
                                        <div class="text-muted fs-8">Pending</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                @if (session('info'))
                    <div class="alert alert-info d-flex align-items-center mb-5">
                        <i class="bi bi-info-circle me-3 fs-4"></i>
                        <div>{{ session('info') }}</div>
                    </div>
                @endif

                {{-- ── CHECK SHEET ITEMS ── --}}
                @foreach ($groupedItems as $subEquipment => $subItems)
                    <div class="mb-6">
                        <div class="sub-equipment-header mb-3">
                            <div class="fw-bold text-gray-800 fs-6">
                                <i class="bi bi-gear me-2 text-primary"></i>
                                {{ $subEquipment ?: 'General' }}
                            </div>
                            <div class="text-muted fs-8">{{ $subItems->count() }} item pemeriksaan</div>
                        </div>

                        @foreach ($subItems as $item)
                            <div class="check-item-card status-{{ $item->status }}" id="card-{{ $item->id }}"
                                data-item-id="{{ $item->id }}">
                                <div class="p-4">
                                    {{-- Item Header --}}
                                    <div class="d-flex align-items-start gap-3 mb-3">
                                        <div class="item-num-badge">{{ $item->item_number }}</div>
                                        <div class="flex-grow-1">
                                            <div class="fw-bold text-gray-800 mb-1">{{ $item->check_item }}</div>
                                            <div class="text-muted fs-8">
                                                <i class="bi bi-shield-check me-1"></i>
                                                {{ $item->maintenance_standard }}
                                            </div>
                                            @if (!empty($item->pm_types))
                                                <div class="d-flex gap-1 mt-1 flex-wrap">
                                                    @foreach ($item->pm_types as $pt)
                                                        <span
                                                            class="badge badge-light-secondary fs-8">{{ $pt }}</span>
                                                    @endforeach
                                                </div>
                                            @endif
                                        </div>
                                        <div class="text-end text-muted fs-8">
                                            <div><i class="bi bi-people me-1"></i>{{ $item->man_power }} org</div>
                                            <div><i class="bi bi-clock me-1"></i>{{ $item->time_minutes }} mnt</div>
                                        </div>
                                    </div>

                                    {{-- Status Buttons --}}
                                    <div class="d-flex align-items-center gap-3 flex-wrap">
                                        <div class="status-btn-group d-flex gap-1">
                                            <button type="button"
                                                class="btn btn-sm btn-outline-success {{ $item->status === 'ok' ? 'active-ok' : '' }}"
                                                onclick="setStatus({{ $item->id }}, 'ok', this)">
                                                <i class="bi bi-check-lg me-1"></i>OK
                                            </button>
                                            <button type="button"
                                                class="btn btn-sm btn-outline-danger {{ $item->status === 'ng' ? 'active-ng' : '' }}"
                                                onclick="setStatus({{ $item->id }}, 'ng', this)">
                                                <i class="bi bi-x-lg me-1"></i>NG
                                            </button>
                                            <button type="button"
                                                class="btn btn-sm btn-outline-secondary {{ $item->status === 'na' ? 'active-na' : '' }}"
                                                onclick="setStatus({{ $item->id }}, 'na', this)">
                                                N/A
                                            </button>
                                        </div>

                                        {{-- Remarks --}}
                                        <input type="text"
                                            class="form-control form-control-sm flex-grow-1 remarks-input"
                                            placeholder="Keterangan / catatan..." value="{{ $item->remarks ?? '' }}"
                                            data-item-id="{{ $item->id }}" style="min-width: 200px;"
                                            onblur="saveRemarks({{ $item->id }}, this.value)">

                                        {{-- Action required --}}
                                        <div class="form-check form-switch mb-0">
                                            <input class="form-check-input" type="checkbox" id="req-{{ $item->id }}"
                                                {{ $item->requires_action ? 'checked' : '' }}
                                                onchange="toggleAction({{ $item->id }}, this.checked)">
                                            <label class="form-check-label fs-8 text-muted"
                                                for="req-{{ $item->id }}">
                                                Perlu tindakan
                                            </label>
                                        </div>

                                        {{-- Upload foto --}}
                                        <div class="d-flex align-items-center gap-2">
                                            <label class="btn btn-sm btn-light-primary mb-0" style="cursor:pointer">
                                                <i class="bi bi-camera me-1"></i>Foto
                                                <input type="file" accept="image/*" style="display:none"
                                                    onchange="uploadPhoto({{ $item->id }}, this)">
                                            </label>
                                            {{-- Foto yang sudah ada --}}
                                            <div class="d-flex gap-1 flex-wrap" id="photos-{{ $item->id }}">
                                                @foreach ($item->photos as $ph)
                                                    <img src="{{ $ph['url'] }}" class="photo-thumb"
                                                        onclick="previewPhoto('{{ $ph['url'] }}')"
                                                        title="Klik untuk lihat">
                                                @endforeach
                                            </div>
                                        </div>
                                    </div>

                                    {{-- Action Required Detail (hidden by default) --}}
                                    <div id="actionDetail-{{ $item->id }}"
                                        class="{{ $item->requires_action ? '' : 'd-none' }} mt-3">
                                        <div
                                            class="alert alert-light-warning border border-warning border-dashed py-3 mb-0">
                                            <label class="fw-semibold fs-8 text-warning mb-1">
                                                <i class="bi bi-wrench me-1"></i>Tindakan yang Diperlukan:
                                            </label>
                                            <input type="text" class="form-control form-control-sm"
                                                id="actionInput-{{ $item->id }}"
                                                placeholder="Deskripsikan tindakan yang perlu dilakukan..."
                                                value="{{ $item->action_required ?? '' }}"
                                                onblur="saveAction({{ $item->id }}, this.value)">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        @endforeach
                    </div>
                @endforeach

                {{-- ── FLOATING SUBMIT (mobile) ── --}}
                <div class="d-lg-none position-fixed bottom-0 start-0 end-0 p-3"
                    style="background: rgba(255,255,255,.95); border-top: 1px solid #eff2f5; z-index: 99;">
                    <button class="btn btn-primary w-100" id="btnCompleteMobile"
                        {{ $progress['percent'] < 100 ? 'disabled' : '' }} onclick="submitComplete()">
                        <i class="bi bi-check-circle me-2"></i>
                        Selesaikan PM (<span id="progressTextMobile">{{ $progress['percent'] }}</span>%)
                    </button>
                </div>

                {{-- ── MODAL PREVIEW FOTO ── --}}
                <div class="modal fade" id="photoModal" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content border-0">
                            <div class="modal-header border-0 pb-0">
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body text-center p-4">
                                <img id="previewImg" src="" class="img-fluid rounded" style="max-height: 70vh;">
                            </div>
                        </div>
                    </div>
                </div>

                {{-- ── MODAL KONFIRMASI SELESAI ── --}}
                <div class="modal fade" id="completeModal" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content border-0 shadow">
                            <div class="modal-header border-0">
                                <h5 class="modal-title fw-bold">
                                    <i class="bi bi-check-circle text-success me-2"></i>
                                    Selesaikan Pengerjaan PM?
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p class="text-muted mb-3">
                                    Semua <strong>{{ $progress['total'] }} item</strong> sudah diisi.
                                    Record akan disubmit ke Checker untuk divalidasi.
                                </p>
                                <div class="alert alert-light-info">
                                    <i class="bi bi-info-circle me-2"></i>
                                    Setelah disubmit, data tidak dapat diubah kecuali dikembalikan oleh Checker.
                                </div>
                            </div>
                            <div class="modal-footer border-0">
                                <button type="button" class="btn btn-light" data-bs-dismiss="modal">Batal</button>
                                <form method="POST" action="{{ route('admin.records.complete', $record->id) }}">
                                    @csrf
                                    <button type="submit" class="btn btn-success">
                                        <i class="bi bi-check-lg me-1"></i>Ya, Selesaikan PM
                                    </button>
                                </form>
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
        const RECORD_ID = {{ $record->id }};
        const API_BASE = '{{ url('/admin/maintenance/records') }}';
        const CSRF = '{{ csrf_token() }}';

        let saveTimer = {};
        let currentStats = {
            ok: {{ $progress['ok'] }},
            ng: {{ $progress['ng'] }},
            pending: {{ $progress['pending'] }},
            done: {{ $progress['done'] }},
            total: {{ $progress['total'] }},
        };

        // ── Set status item ──────────────────────────────────────
        function setStatus(itemId, status, btn) {
            // Update UI card border
            const card = document.getElementById('card-' + itemId);
            card.className = card.className.replace(/status-\w+/, 'status-' + status);

            // Update button UI
            const group = card.querySelector('.status-btn-group');
            group.querySelectorAll('button').forEach(b => {
                b.classList.remove('active-ok', 'active-ng', 'active-na');
            });
            btn.classList.add('active-' + status);

            // Save ke server
            saveItem(itemId, {
                status
            });
        }

        // ── Simpan remarks (debounce 800ms) ──────────────────────
        function saveRemarks(itemId, value) {
            clearTimeout(saveTimer['r' + itemId]);
            saveTimer['r' + itemId] = setTimeout(() => saveItem(itemId, {
                remarks: value
            }), 800);
        }

        // ── Toggle requires_action ────────────────────────────────
        function toggleAction(itemId, checked) {
            const detail = document.getElementById('actionDetail-' + itemId);
            if (checked) detail.classList.remove('d-none');
            else detail.classList.add('d-none');
            saveItem(itemId, {
                requires_action: checked
            });
        }

        // ── Simpan action_required ────────────────────────────────
        function saveAction(itemId, value) {
            saveItem(itemId, {
                action_required: value
            });
        }

        // ── Core AJAX save ────────────────────────────────────────
        function saveItem(itemId, data) {
            showSave('saving');

            // Kumpulkan data lengkap item
            const card = document.getElementById('card-' + itemId);
            const statusEl = card.querySelector('[class*="active-ok"], [class*="active-ng"], [class*="active-na"]');
            const status = statusEl ?
                (statusEl.classList.contains('active-ok') ? 'ok' :
                    statusEl.classList.contains('active-ng') ? 'ng' : 'na') :
                'pending';

            const remarks = card.querySelector('.remarks-input')?.value ?? '';
            const reqAction = document.getElementById('req-' + itemId)?.checked ?? false;
            const actionVal = document.getElementById('actionInput-' + itemId)?.value ?? '';

            const payload = Object.assign({
                status,
                remarks,
                requires_action: reqAction,
                action_required: actionVal,
            }, data);

            $.ajax({
                url: `${API_BASE}/${RECORD_ID}/items/${itemId}`,
                method: 'PUT',
                data: JSON.stringify(payload),
                contentType: 'application/json',
                headers: {
                    'X-CSRF-TOKEN': CSRF,
                    'Accept': 'application/json'
                },
                success: function(res) {
                    if (res.success) {
                        showSave('saved');
                        updateProgress(res.progress);
                        // Hitung ulang stats lokal
                        recalcStats();
                    }
                },
                error: function() {
                    showSave('error');
                }
            });
        }

        // ── Upload foto ───────────────────────────────────────────
        function uploadPhoto(itemId, input) {
            if (!input.files.length) return;
            const file = input.files[0];
            const formData = new FormData();
            formData.append('photo', file);
            formData.append('_token', CSRF);

            showSave('saving');

            $.ajax({
                url: `${API_BASE}/${RECORD_ID}/upload-photo/${itemId}`,
                method: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(res) {
                    if (res.success) {
                        const img = $('<img>').addClass('photo-thumb')
                            .attr('src', res.photo.url)
                            .attr('title', 'Klik untuk lihat')
                            .on('click', () => previewPhoto(res.photo.url));
                        $('#photos-' + itemId).append(img);
                        showSave('saved');
                    }
                },
                error: function() {
                    showSave('error');
                }
            });

            input.value = ''; // reset input
        }

        // ── Preview foto modal ────────────────────────────────────
        function previewPhoto(url) {
            document.getElementById('previewImg').src = url;
            new bootstrap.Modal(document.getElementById('photoModal')).show();
        }

        // ── Tampilkan progress ────────────────────────────────────
        function updateProgress(prog) {
            document.getElementById('progressBar').style.width = prog.percent + '%';
            document.getElementById('progressText').textContent = prog.done + '/' + prog.total + ' item';
            document.getElementById('progressPercent').textContent = prog.percent + '%';
            document.getElementById('progressTextMobile').textContent = prog.percent;

            // Enable/disable complete button
            const canComplete = prog.percent >= 100;
            document.getElementById('btnComplete').disabled = !canComplete;
            const btnMobile = document.getElementById('btnCompleteMobile');
            if (btnMobile) btnMobile.disabled = !canComplete;
        }

        // ── Hitung stats OK/NG/Pending dari DOM ──────────────────
        function recalcStats() {
            let ok = 0,
                ng = 0,
                pending = 0;
            document.querySelectorAll('.check-item-card').forEach(card => {
                if (card.classList.contains('status-ok')) ok++;
                else if (card.classList.contains('status-ng')) ng++;
                else pending++;
            });
            document.getElementById('statOk').textContent = ok;
            document.getElementById('statNg').textContent = ng;
            document.getElementById('statPending').textContent = pending;
        }

        // ── Indikator simpan ──────────────────────────────────────
        let saveTimeout;

        function showSave(state) {
            const el = document.getElementById('saveIndicator');
            clearTimeout(saveTimeout);
            if (state === 'saving') {
                el.className = 'save-indicator saving';
                el.innerHTML = '<i class="bi bi-arrow-repeat spin me-1"></i>Menyimpan...';
            } else if (state === 'saved') {
                el.className = 'save-indicator saved';
                el.innerHTML = '<i class="bi bi-check-circle me-1"></i>Tersimpan';
                saveTimeout = setTimeout(() => {
                    el.innerHTML = '';
                }, 2500);
            } else {
                el.className = 'save-indicator error';
                el.innerHTML = '<i class="bi bi-x-circle me-1"></i>Gagal simpan';
                saveTimeout = setTimeout(() => {
                    el.innerHTML = '';
                }, 4000);
            }
        }

        // ── Modal selesai ─────────────────────────────────────────
        function submitComplete() {
            new bootstrap.Modal(document.getElementById('completeModal')).show();
        }

        // ── Spinner animation ─────────────────────────────────────
        const style = document.createElement('style');
        style.textContent = '.spin { animation: spin .6s linear infinite; display: inline-block; }' +
            '@keyframes spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    </script>
@endpush
