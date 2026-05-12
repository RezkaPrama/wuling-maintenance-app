{{-- resources/views/admin/check-sheet/template/create.blade.php --}}
{{-- Blade yang sama bisa dipakai untuk edit, cukup ganti @section title dan action --}}
@extends('layouts.app')

@section('title')
    Check Sheet
@endsection
@section('subtitle')
    Buat Check Sheet
@endsection
@section('menuUtama')
    Menu Utama
@endsection
@section('menuItem')
    Check Sheet
@endsection

@push('styles')
    <style>
        /* ── Item builder table ── */
        .item-table {
            border-collapse: separate;
            border-spacing: 0;
            width: 100%;
            min-width: 900px;
        }

        .item-table thead th {
            background: #1e3a5f;
            color: #fff;
            padding: 8px 10px;
            font-size: .7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: .04em;
            border: 1px solid #2d5186;
            white-space: nowrap;
        }

        .item-table tbody td {
            padding: 6px 8px;
            border: 1px solid #e4e6ef;
            vertical-align: top;
            background: #fff;
        }

        .item-table tbody tr:hover td {
            background: #f8f9ff;
        }

        .item-table tbody tr.dragging td {
            background: #eef2ff;
            opacity: .7;
        }

        /* Row number badge */
        .row-num {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #f5f8fa;
            color: #6c757d;
            font-size: .72rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        /* PM Type checkboxes */
        .pm-type-checks {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }

        .pm-type-label {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 8px;
            border-radius: 5px;
            cursor: pointer;
            border: 1.5px solid #e4e6ef;
            font-size: .7rem;
            font-weight: 600;
            transition: all .15s;
            user-select: none;
        }

        .pm-type-label:hover {
            border-color: #6366f1;
            background: #f0f0ff;
        }

        .pm-type-label input[type="checkbox"] {
            display: none;
        }

        .pm-type-label.checked {
            border-color: transparent;
            color: #fff;
        }

        /* Drag handle */
        .drag-handle {
            cursor: grab;
            color: #b5b5c3;
            font-size: 1rem;
            padding: 0 4px;
            display: flex;
            align-items: center;
        }

        .drag-handle:active {
            cursor: grabbing;
        }

        /* Input styles */
        .cell-input {
            border: 1px solid #e4e6ef;
            border-radius: 5px;
            padding: 5px 8px;
            width: 100%;
            font-size: .78rem;
            outline: none;
            background: #fff;
            transition: border-color .15s;
        }

        .cell-input:focus {
            border-color: #6366f1;
            background: #f8f9ff;
        }

        .cell-textarea {
            resize: vertical;
            min-height: 52px;
        }

        .cell-number {
            text-align: center;
            width: 60px;
        }

        /* Section divider row */
        .section-row td {
            background: #eef2ff !important;
            padding: 4px 10px !important;
            font-weight: 700;
            color: #3f51b5;
            font-size: .76rem;
        }

        /* Toolbar */
        .item-toolbar {
            background: #f8f9ff;
            border-radius: 8px;
            padding: 10px 14px;
        }

        /* Sub-equipment group tags */
        .sub-eq-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            background: #eef2ff;
            color: #3f51b5;
            font-size: .7rem;
            font-weight: 600;
            cursor: pointer;
            border: 1px dashed #c5cae9;
        }
    </style>
@endpush

@section('content')
    <div class="content d-flex flex-column flex-column-fluid" id="kt_content">

        @include('partials.toolbar')

        <div class="post d-flex flex-column-fluid" id="kt_post">
            <div id="kt_content_container" class="container-xxl">
                <div class="d-flex align-items-center gap-3 mb-6">
                    <a href="{{ route('admin.check-sheet.template.index') }}" class="btn btn-sm btn-light">
                        <i class="bi bi-arrow-left"></i>
                    </a>
                    <div>
                        <h1 class="fs-2 fw-bold text-gray-900 mb-0">
                            {{ isset($template) ? 'Edit Template' : 'Buat Template Baru' }}
                        </h1>
                        <span class="text-muted fs-6">
                            {{ isset($template) ? 'Ubah header dan item check sheet' : 'Definisikan check sheet items untuk equipment dan PM cycle tertentu' }}
                        </span>
                    </div>
                </div>

                @if ($errors->any())
                    <div class="alert alert-danger mb-5">
                        <div class="fw-bold mb-1"><i class="bi bi-exclamation-triangle me-2"></i>Terdapat kesalahan:</div>
                        <ul class="mb-0 ps-3">
                            @foreach ($errors->all() as $e)
                                <li class="fs-7">{{ $e }}</li>
                            @endforeach
                        </ul>
                    </div>
                @endif

                @php
                    $isEdit = isset($template);
                    $action = $isEdit
                        ? route('admin.check-sheet.template.update', $template->id)
                        : route('admin.check-sheet.template.store');
                    $method = $isEdit ? 'PUT' : 'POST';
                @endphp

                <form method="POST" action="{{ $action }}" id="templateForm">
                    @csrf
                    @if ($isEdit)
                        @method('PUT')
                    @endif

                    <div class="row g-5">

                        {{-- ── KIRI: Header Info ── --}}
                        <div class="col-lg-4">
                            <div class="card card-flush border-0 shadow-sm mb-5">
                                <div class="card-header border-0 pt-6">
                                    <h3 class="card-title fw-bold fs-5">
                                        <i class="bi bi-info-circle me-2 text-primary"></i>Info Template
                                    </h3>
                                </div>
                                <div class="card-body pt-2">

                                    {{-- Equipment --}}
                                    <div class="mb-4">
                                        <label class="form-label fw-semibold required">Equipment</label>
                                        <select name="equipment_id" id="equipmentSelect"
                                            class="form-select @error('equipment_id') is-invalid @enderror" required>
                                            <option value="">— Pilih Equipment —</option>
                                            @foreach ($equipmentList as $eq)
                                                <option value="{{ $eq->id }}" data-code="{{ $eq->equipment_code }}"
                                                    data-group="{{ $eq->etm_group }}"
                                                    {{ old('equipment_id', $isEdit ? $template->equipment_id : '') == $eq->id ? 'selected' : '' }}>
                                                    [{{ $eq->equipment_code }}] {{ $eq->equipment_name }}
                                                    @if ($eq->etm_group)
                                                        — {{ $eq->etm_group }}
                                                    @endif
                                                </option>
                                            @endforeach
                                        </select>
                                        @error('equipment_id')
                                            <div class="invalid-feedback">{{ $message }}</div>
                                        @enderror
                                    </div>

                                    {{-- Template Name --}}
                                    <div class="mb-4">
                                        <label class="form-label fw-semibold required">Nama Template</label>
                                        <input type="text" name="template_name"
                                            class="form-control @error('template_name') is-invalid @enderror"
                                            placeholder="Contoh: PM 6 Bulan Welding Robot"
                                            value="{{ old('template_name', $isEdit ? $template->template_name : '') }}"
                                            required>
                                        @error('template_name')
                                            <div class="invalid-feedback">{{ $message }}</div>
                                        @enderror
                                    </div>

                                    {{-- Doc Number --}}
                                    <div class="mb-4">
                                        <label class="form-label fw-semibold required">Doc Number</label>
                                        <input type="text" name="doc_number"
                                            class="form-control @error('doc_number') is-invalid @enderror"
                                            placeholder="Contoh: ETM-PM-WLD-001"
                                            value="{{ old('doc_number', $isEdit ? $template->doc_number : '') }}" required>
                                        @error('doc_number')
                                            <div class="invalid-feedback">{{ $message }}</div>
                                        @enderror
                                    </div>

                                    {{-- PM Cycle --}}
                                    <div class="mb-4">
                                        <label class="form-label fw-semibold required">PM Cycle</label>
                                        <div class="d-flex gap-2">
                                            @foreach (['6M' => '6 Bulan', '1Y' => '1 Tahun', '2Y' => '2 Tahun'] as $val => $label)
                                                <label
                                                    class="flex-grow-1 text-center py-2 rounded border cursor-pointer
                                fw-semibold fs-7 transition-all
                                {{ old('pm_cycle', $isEdit ? $template->pm_cycle : '') === $val
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-light border text-muted' }}"
                                                    id="cycleLabel{{ $val }}" style="cursor:pointer">
                                                    <input type="radio" name="pm_cycle" value="{{ $val }}"
                                                        class="d-none cycle-radio"
                                                        {{ old('pm_cycle', $isEdit ? $template->pm_cycle : '') === $val ? 'checked' : '' }}>
                                                    {{ $label }}
                                                </label>
                                            @endforeach
                                        </div>
                                        @error('pm_cycle')
                                            <div class="text-danger fs-8 mt-1">{{ $message }}</div>
                                        @enderror
                                    </div>

                                    {{-- PM Types Legend --}}
                                    <div class="border-top pt-4 mt-2">
                                        <div class="text-muted fs-8 fw-semibold mb-2">Kode Warna PM Type:</div>
                                        <div class="d-flex flex-wrap gap-2">
                                            @foreach ($pmTypes as $pt)
                                                <span class="badge fw-semibold"
                                                    style="background: {{ $pt->color_code ?? '#6c757d' }}20;
                                       color: {{ $pt->color_code ?? '#6c757d' }};
                                       border: 1px solid {{ $pt->color_code ?? '#6c757d' }}50">
                                                    {{ $pt->code }}
                                                </span>
                                            @endforeach
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {{-- Panduan --}}
                            <div class="card card-flush border-0 shadow-sm bg-light-primary">
                                <div class="card-body py-5 px-5">
                                    <div class="fw-bold text-gray-800 mb-2 fs-7">
                                        <i class="bi bi-lightbulb text-primary me-2"></i>Tips Pengisian
                                    </div>
                                    <ul class="text-muted fs-8 ps-3 mb-0">
                                        <li class="mb-1">Gunakan kolom <strong>Sub Equip.</strong> untuk mengelompokkan
                                            item (contoh: "Motor", "Sensor", "Frame")</li>
                                        <li class="mb-1">Centang <strong>PM Type</strong> sesuai jenis pekerjaan untuk
                                            item tersebut</li>
                                        <li class="mb-1">Seret baris <i class="bi bi-grip-vertical"></i> untuk ubah urutan
                                        </li>
                                        <li class="mb-1">Klik tombol + untuk tambah baris baru</li>
                                        <li>Item bisa dikelompokkan per Sub Equipment dengan tombol "Tambah Grup"</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {{-- ── KANAN: Item Builder ── --}}
                        <div class="col-lg-8">
                            <div class="card card-flush border-0 shadow-sm">
                                <div class="card-header border-0 pt-6">
                                    <h3 class="card-title fw-bold fs-5">
                                        <i class="bi bi-list-check me-2 text-primary"></i>
                                        Check Sheet Items
                                        <span class="badge badge-light-primary ms-2 fs-8" id="itemCountBadge">
                                            {{ $isEdit ? $items->count() : 0 }} item
                                        </span>
                                    </h3>
                                    <div class="card-toolbar d-flex gap-2">
                                        {{-- Summary --}}
                                        <div class="text-muted fs-8 d-none d-md-flex align-items-center gap-3 me-3">
                                            <span>Total MP: <strong
                                                    id="sumMp">{{ $isEdit ? $items->sum('man_power') : 0 }}</strong></span>
                                            <span>Total Time: <strong
                                                    id="sumTime">{{ $isEdit ? $items->sum('time_minutes') : 0 }}</strong>
                                                mnt</span>
                                        </div>
                                        <button type="button" class="btn btn-sm btn-light-primary" onclick="addRow()">
                                            <i class="bi bi-plus-circle me-1"></i>Tambah Item
                                        </button>
                                        <button type="button" class="btn btn-sm btn-light-secondary"
                                            onclick="addSectionRow()">
                                            <i class="bi bi-folder-plus me-1"></i>Tambah Grup
                                        </button>
                                    </div>
                                </div>

                                <div class="card-body pt-2 px-4 pb-4">
                                    {{-- Toolbar shortcut sub-equipment --}}
                                    <div class="item-toolbar mb-3 d-flex align-items-center gap-2 flex-wrap">
                                        <span class="text-muted fs-8 fw-semibold">Sub Equipment:</span>
                                        <div id="subEqTags" class="d-flex gap-2 flex-wrap">
                                            {{-- Tags akan muncul dinamis --}}
                                        </div>
                                        <span class="text-muted fs-8 ms-2">
                                            <i class="bi bi-info-circle"></i>
                                            Klik tag untuk isi cepat ke baris terpilih
                                        </span>
                                    </div>

                                    <div class="table-responsive">
                                        <table class="item-table" id="itemTable">
                                            <thead>
                                                <tr>
                                                    <th style="width:30px"></th>
                                                    <th style="width:30px">#</th>
                                                    <th style="width:100px">Sub Equip.</th>
                                                    <th style="min-width:160px">Check Item <span
                                                            class="text-danger">*</span></th>
                                                    <th style="min-width:160px">Maintenance Standard <span
                                                            class="text-danger">*</span></th>
                                                    <th style="min-width:200px">PM Type <span class="text-danger">*</span>
                                                    </th>
                                                    <th style="width:64px">Man<br>Power</th>
                                                    <th style="width:64px">Time<br>(mnt)</th>
                                                    <th style="width:36px"></th>
                                                </tr>
                                            </thead>
                                            <tbody id="itemBody">
                                                {{-- Rows populated by JS / Blade --}}
                                            </tbody>
                                        </table>
                                    </div>

                                    {{-- Empty state --}}
                                    <div id="emptyState" class="text-center py-8" style="display:none">
                                        <i class="bi bi-list-ul fs-1 text-muted mb-3 d-block"></i>
                                        <p class="text-muted mb-2">Belum ada item. Klik "Tambah Item" untuk mulai.</p>
                                    </div>

                                    <div class="d-flex gap-2 mt-4">
                                        <button type="button" class="btn btn-sm btn-light-primary" onclick="addRow()">
                                            <i class="bi bi-plus me-1"></i>Tambah Item
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {{-- Submit --}}
                            <div class="d-flex gap-3 mt-5">
                                <button type="submit" class="btn btn-primary flex-grow-1" id="submitBtn">
                                    <i class="bi bi-check-circle me-2"></i>
                                    {{ $isEdit ? 'Simpan Perubahan' : 'Buat Template' }}
                                </button>
                                <a href="{{ route('admin.check-sheet.template.index') }}" class="btn btn-light">
                                    Batal
                                </a>
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
        // ── PM Types dari server ──────────────────────────────────
        const PM_TYPES = @json($pmTypes);

        // ── Existing items (edit mode) ────────────────────────────
        const EXISTING_ITEMS = @json($isEdit ? $items->values() : collect());

        let rowIndex = 0;

        // ── Init ─────────────────────────────────────────────────
        document.addEventListener('DOMContentLoaded', () => {
            // Cycle radio pill styling
            document.querySelectorAll('.cycle-radio').forEach(radio => {
                radio.addEventListener('change', () => refreshCycleLabels());
            });
            refreshCycleLabels();

            // Load existing items (edit mode)
            if (EXISTING_ITEMS.length > 0) {
                EXISTING_ITEMS.forEach(item => addRow(item));
            } else {
                // Default 3 baris kosong untuk create
                addRow();
                addRow();
                addRow();
            }

            refreshItemCount();
            refreshSubEqTags();
            initSortable();
        });

        // ── Cycle label style ─────────────────────────────────────
        function refreshCycleLabels() {
            document.querySelectorAll('.cycle-radio').forEach(radio => {
                const label = radio.closest('label');
                if (radio.checked) {
                    label.classList.add('bg-primary', 'text-white', 'border-primary');
                    label.classList.remove('bg-light', 'text-muted');
                } else {
                    label.classList.remove('bg-primary', 'text-white', 'border-primary');
                    label.classList.add('bg-light', 'text-muted');
                }
            });
        }

        // ── Tambah baris item ─────────────────────────────────────
        function addRow(data = null) {
            const idx = rowIndex++;
            const body = document.getElementById('itemBody');
            const tr = document.createElement('tr');
            tr.dataset.idx = idx;

            // Build PM Type checkboxes
            const pmChecks = PM_TYPES.map(pt => {
                const isChecked = data?.pm_types?.includes(pt.code) || data?.pm_types?.includes(pt.name);
                const color = pt.color_code || '#6c757d';
                return `<label class="pm-type-label ${isChecked ? 'checked' : ''}"
                    style="${isChecked ? `background:${color};border-color:${color}` : ''}"
                    data-color="${color}">
                    <input type="checkbox"
                        name="items[${idx}][pm_types][]"
                        value="${pt.code}"
                        ${isChecked ? 'checked' : ''}
                        onchange="onPmTypeChange(this)">
                    ${pt.code}
                </label>`;
            }).join('');

            tr.innerHTML = `
        <td class="text-center">
            <span class="drag-handle" title="Seret untuk ubah urutan">
                <i class="bi bi-grip-vertical"></i>
            </span>
        </td>
        <td class="text-center">
            <span class="row-num">${document.querySelectorAll('#itemBody tr').length + 1}</span>
        </td>
        <td>
            <input type="text" class="cell-input sub-eq-input"
                name="items[${idx}][sub_equipment]"
                placeholder="Sub Equip."
                value="${data?.sub_equipment ?? ''}"
                onblur="refreshSubEqTags()"
                style="width:90px">
        </td>
        <td>
            <textarea class="cell-input cell-textarea"
                name="items[${idx}][check_item]"
                placeholder="Nama item yang diperiksa..."
                rows="2" required>${data?.check_item ?? ''}</textarea>
        </td>
        <td>
            <textarea class="cell-input cell-textarea"
                name="items[${idx}][maintenance_standard]"
                placeholder="Standar kondisi yang harus dipenuhi..."
                rows="2" required>${data?.maintenance_standard ?? ''}</textarea>
        </td>
        <td>
            <div class="pm-type-checks">${pmChecks}</div>
            <div class="text-danger fs-8 mt-1 pm-type-warn" style="display:none">
                <i class="bi bi-exclamation-triangle me-1"></i>Pilih minimal 1
            </div>
        </td>
        <td>
            <input type="number" class="cell-input cell-number mp-input"
                name="items[${idx}][man_power]"
                value="${data?.man_power ?? 1}"
                min="1" max="99" required
                onchange="recalcSummary()">
        </td>
        <td>
            <input type="number" class="cell-input cell-number time-input"
                name="items[${idx}][time_minutes]"
                value="${data?.time_minutes ?? ''}"
                min="1" max="9999" required
                placeholder="mnt"
                onchange="recalcSummary()">
        </td>
        <td class="text-center">
            <button type="button" class="btn btn-sm btn-icon btn-light-danger"
                onclick="removeRow(this)" title="Hapus baris">
                <i class="bi bi-trash3" style="font-size:.7rem"></i>
            </button>
        </td>
    `;

            body.appendChild(tr);
            refreshItemCount();
            refreshEmptyState();
            recalcSummary();
        }

        // ── Tambah baris section/grup ─────────────────────────────
        function addSectionRow() {
            const name = prompt('Nama Sub Equipment / Grup:', '');
            if (name === null) return;
            const idx = rowIndex++;
            const body = document.getElementById('itemBody');
            const tr = document.createElement('tr');
            tr.dataset.idx = idx;
            tr.dataset.isSec = '1';
            tr.innerHTML = `
        <td class="text-center"><span class="drag-handle"><i class="bi bi-grip-vertical"></i></span></td>
        <td colspan="7" style="background:#eef2ff;font-weight:700;color:#3f51b5;font-size:.76rem;padding:5px 12px">
            <i class="bi bi-folder2-open me-2"></i>
            <input type="text" name="sec_label_${idx}" value="${name}"
                style="border:none;background:transparent;font-weight:700;color:#3f51b5;font-size:.76rem;outline:none;width:300px"
                placeholder="Nama grup...">
            <span class="text-muted fs-8 fw-normal ms-2">(baris pemisah, tidak masuk ke check item)</span>
        </td>
        <td class="text-center">
            <button type="button" class="btn btn-sm btn-icon btn-light-danger"
                onclick="removeRow(this)" title="Hapus pemisah">
                <i class="bi bi-trash3" style="font-size:.7rem"></i>
            </button>
        </td>
    `;
            body.appendChild(tr);
            refreshSubEqTags();
        }

        // ── Hapus baris ───────────────────────────────────────────
        function removeRow(btn) {
            const tr = btn.closest('tr');
            if (!tr) return;
            tr.remove();
            refreshItemCount();
            refreshRowNumbers();
            refreshEmptyState();
            recalcSummary();
            refreshSubEqTags();
        }

        // ── PM Type checkbox toggle style ────────────────────────
        function onPmTypeChange(cb) {
            const label = cb.closest('.pm-type-label');
            const color = label.dataset.color;
            if (cb.checked) {
                label.classList.add('checked');
                label.style.background = color;
                label.style.borderColor = color;
            } else {
                label.classList.remove('checked');
                label.style.background = '';
                label.style.borderColor = '';
            }
            // Warn jika tidak ada yang dicentang
            const group = label.closest('td');
            const noneChecked = !group.querySelector('input[type=checkbox]:checked');
            group.querySelector('.pm-type-warn').style.display = noneChecked ? '' : 'none';
        }

        // ── Refresh row numbers ───────────────────────────────────
        function refreshRowNumbers() {
            let n = 1;
            document.querySelectorAll('#itemBody tr:not([data-is-sec])').forEach(tr => {
                const badge = tr.querySelector('.row-num');
                if (badge) badge.textContent = n++;
            });
        }

        // ── Refresh item count badge ──────────────────────────────
        function refreshItemCount() {
            const count = document.querySelectorAll('#itemBody tr:not([data-is-sec])').length;
            document.getElementById('itemCountBadge').textContent = count + ' item';
            refreshRowNumbers();
        }

        // ── Refresh empty state ───────────────────────────────────
        function refreshEmptyState() {
            const hasRows = document.querySelectorAll('#itemBody tr').length > 0;
            document.getElementById('emptyState').style.display = hasRows ? 'none' : '';
        }

        // ── Recalc summary total MP & Time ───────────────────────
        function recalcSummary() {
            let mp = 0,
                time = 0;
            document.querySelectorAll('.mp-input').forEach(el => mp += parseInt(el.value) || 0);
            document.querySelectorAll('.time-input').forEach(el => time += parseInt(el.value) || 0);
            document.getElementById('sumMp').textContent = mp;
            document.getElementById('sumTime').textContent = time;
        }

        // ── Sub Equipment tag list ────────────────────────────────
        function refreshSubEqTags() {
            const tags = new Set();
            document.querySelectorAll('.sub-eq-input').forEach(el => {
                if (el.value.trim()) tags.add(el.value.trim());
            });
            const container = document.getElementById('subEqTags');
            container.innerHTML = '';
            tags.forEach(tag => {
                const span = document.createElement('span');
                span.className = 'sub-eq-badge';
                span.textContent = tag;
                span.onclick = () => fillActiveSubEq(tag);
                container.appendChild(span);
            });
        }

        // ── Isi sub equipment ke baris yang sedang difokus ────────
        let lastFocusedSubEqInput = null;
        document.addEventListener('focusin', e => {
            if (e.target.classList.contains('sub-eq-input')) {
                lastFocusedSubEqInput = e.target;
            }
        });

        function fillActiveSubEq(tag) {
            if (lastFocusedSubEqInput) {
                lastFocusedSubEqInput.value = tag;
                refreshSubEqTags();
            }
        }

        // ── Sortable (drag & drop) ────────────────────────────────
        function initSortable() {
            // Simple manual drag-drop tanpa library
            // Jika Sortable.js tersedia (Metronic biasanya include), pakai itu
            if (typeof Sortable !== 'undefined') {
                Sortable.create(document.getElementById('itemBody'), {
                    handle: '.drag-handle',
                    animation: 150,
                    onEnd() {
                        refreshRowNumbers();
                        refreshSubEqTags();
                    }
                });
            }
        }

        // ── Validasi sebelum submit ───────────────────────────────
        document.getElementById('templateForm').addEventListener('submit', function(e) {
            let hasError = false;

            // Cek minimal 1 item
            const itemRows = document.querySelectorAll('#itemBody tr:not([data-is-sec])');
            if (itemRows.length === 0) {
                alert('Tambahkan minimal 1 item check sheet.');
                e.preventDefault();
                return;
            }

            // Cek PM Type tiap row
            itemRows.forEach(tr => {
                const noneChecked = !tr.querySelector('input[type=checkbox]:checked');
                const warn = tr.querySelector('.pm-type-warn');
                if (noneChecked) {
                    if (warn) warn.style.display = '';
                    hasError = true;
                }
            });

            if (hasError) {
                alert('Setiap item harus memiliki minimal 1 PM Type yang dicentang.');
                e.preventDefault();
                return;
            }

            document.getElementById('submitBtn')
                .innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Menyimpan...'
            document.getElementById('submitBtn').disabled = true;
        });
    </script>
@endpush
