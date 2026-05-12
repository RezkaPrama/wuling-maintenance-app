{{-- resources/views/admin/maintenance/record/work.blade.php --}}
@extends('layouts.app')

@section('title')
    Pengerjaan PM
@endsection
@section('subtitle', 'Pengerjaan PM — ' . $record->record_number)
@section('menuUtama')
    Menu Utama
@endsection
@section('menuItem')
    Equipment
@endsection

@push('styles')
    <style>
        /* ══════════════════════════════════════════
       STICKY PROGRESS BAR
    ══════════════════════════════════════════ */
        .work-sticky-bar {
            position: sticky;
            top: 0;
            z-index: 200;
            background: #fff;
            border-bottom: 2px solid #eff2f5;
            padding: 10px 0;
            margin-bottom: 20px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, .07);
        }

        .progress-track {
            height: 6px;
            border-radius: 999px;
            background: #eff2f5;
            overflow: hidden;
            flex: 1;
        }

        .progress-fill {
            height: 100%;
            border-radius: 999px;
            background: linear-gradient(90deg, #50cd89, #00b272);
            transition: width .5s ease;
        }

        /* ══════════════════════════════════════════
       CHECK SHEET HEADER
    ══════════════════════════════════════════ */
        .cs-header {
            border: 2px solid #181c32;
            border-radius: 8px 8px 0 0;
            overflow: hidden;
            background: #fff;
        }

        .cs-header-top {
            background: #1e3a5f;
            color: #fff;
            padding: 10px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .cs-header-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            border-top: 1px solid #dee2e6;
        }

        .cs-header-cell {
            padding: 6px 12px;
            border-right: 1px solid #dee2e6;
            font-size: .78rem;
        }

        .cs-header-cell:last-child {
            border-right: none;
        }

        .cs-header-cell .lbl {
            color: #6c757d;
            font-weight: 600;
            font-size: .7rem;
        }

        .cs-header-cell .val {
            color: #181c32;
            font-weight: 700;
            margin-top: 1px;
        }

        /* ══════════════════════════════════════════
       TABEL CHECK SHEET
    ══════════════════════════════════════════ */
        .cs-table-wrap {
            overflow-x: auto;
            border: 2px solid #181c32;
            border-top: none;
            border-radius: 0 0 8px 8px;
        }

        .cs-table {
            width: 100%;
            border-collapse: collapse;
            font-size: .78rem;
            min-width: 1100px;
        }

        .cs-table th {
            background: #1e3a5f;
            color: #fff;
            padding: 6px 8px;
            text-align: center;
            vertical-align: middle;
            border: 1px solid #2d5186;
            font-size: .68rem;
            font-weight: 600;
            white-space: nowrap;
        }

        .cs-table th.th-left {
            text-align: left;
        }

        .cs-table td {
            padding: 5px 8px;
            vertical-align: middle;
            border: 1px solid #dee2e6;
            font-size: .78rem;
            color: #181c32;
        }

        .cs-table tr.sub-eq-row td {
            background: #eef2ff;
            font-weight: 700;
            color: #3f51b5;
            font-size: .75rem;
            padding: 5px 12px;
            border-top: 2px solid #c5cae9;
        }

        .cs-table tr.item-row {
            transition: background .12s;
        }

        .cs-table tr.item-row:hover {
            background: #f0f4ff;
        }

        .cs-table tr.item-row.st-ok {
            background: #f0fff6;
        }

        .cs-table tr.item-row.st-ok td:first-child {
            border-left: 3px solid #50cd89;
        }

        .cs-table tr.item-row.st-ng {
            background: #fff5f7;
        }

        .cs-table tr.item-row.st-ng td:first-child {
            border-left: 3px solid #f1416c;
        }

        .cs-table tr.item-row.st-na {
            background: #f9f9f9;
        }

        .cs-table tr.item-row.st-na td:first-child {
            border-left: 3px solid #b5b5c3;
        }

        /* ══════════════════════════════════════════
       PM TYPE CHECKLIST
       Dua lapisan: plan (■) dari template + done (✓) oleh teknisi
    ══════════════════════════════════════════ */
        .pm-type-group {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
        }

        /* Checkbox PM Type yang dikerjakan teknisi */
        .pm-check-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
        }

        .pm-checkbox {
            /* hide native checkbox */
            appearance: none;
            -webkit-appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 4px;
            cursor: pointer;
            border: 2px solid #dee2e6;
            background: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all .15s;
            position: relative;
            flex-shrink: 0;
        }

        .pm-checkbox::after {
            content: '✓';
            font-size: .65rem;
            font-weight: 900;
            color: transparent;
            position: absolute;
            transition: color .1s;
        }

        /* State: plan (dari template) tapi belum dikerjakan */
        .pm-checkbox.is-plan {
            border-color: #b5b5c3;
            background: #f5f5f5;
        }

        .pm-checkbox.is-plan::after {
            content: '■';
            font-size: .55rem;
            color: #b5b5c3;
        }

        /* State: dikerjakan (centang biru) — plan item */
        .pm-checkbox.is-plan.is-done {
            border-color: #009ef7;
            background: #009ef7;
        }

        .pm-checkbox.is-plan.is-done::after {
            content: '✓';
            color: #fff;
            font-size: .7rem;
        }

        /* State: dikerjakan tapi bukan plan (extra) */
        .pm-checkbox.is-extra.is-done {
            border-color: #ffc107;
            background: #ffc107;
        }

        .pm-checkbox.is-extra.is-done::after {
            content: '✓';
            color: #fff;
            font-size: .7rem;
        }

        /* State: plan tapi tidak dikerjakan (warning) — hanya muncul setelah status diisi */
        .pm-checkbox.is-plan.is-skipped {
            border-color: #f1416c;
            background: #fff5f7;
            animation: pulse-red 1.5s ease-in-out infinite;
        }

        .pm-checkbox.is-plan.is-skipped::after {
            content: '!';
            color: #f1416c;
            font-size: .75rem;
            font-weight: 900;
        }

        @keyframes pulse-red {

            0%,
            100% {
                box-shadow: 0 0 0 0 rgba(241, 65, 108, .3);
            }

            50% {
                box-shadow: 0 0 0 4px rgba(241, 65, 108, .1);
            }
        }

        /* Label nama PM Type di bawah checkbox */
        .pm-type-label {
            font-size: .56rem;
            font-weight: 600;
            color: #a1a5b7;
            text-transform: uppercase;
            letter-spacing: .02em;
            white-space: nowrap;
            text-align: center;
            user-select: none;
        }

        .pm-checkbox.is-plan+.pm-type-label {
            color: #7e8299;
        }

        .pm-checkbox.is-plan.is-done+.pm-type-label {
            color: #009ef7;
        }

        .pm-checkbox.is-plan.is-skipped+.pm-type-label {
            color: #f1416c;
        }

        .pm-checkbox.is-extra.is-done+.pm-type-label {
            color: #ffc107;
        }

        /* Cell yang berisi PM checkboxes */
        .pm-cell {
            min-width: 200px;
            padding: 6px 8px !important;
        }

        .pm-cell-inner {
            display: flex;
            gap: 8px;
            align-items: flex-start;
            flex-wrap: wrap;
        }

        /* Legend chip kecil */
        .pm-legend {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: .65rem;
            padding: 2px 7px;
            border-radius: 99px;
            font-weight: 600;
        }

        .pm-legend.plan {
            background: #f5f5f5;
            color: #7e8299;
            border: 1px solid #dee2e6;
        }

        .pm-legend.done {
            background: #e0f5ff;
            color: #009ef7;
            border: 1px solid #b0e0ff;
        }

        .pm-legend.extra {
            background: #fff8e0;
            color: #d07800;
            border: 1px solid #ffe6a0;
        }

        .pm-legend.skip {
            background: #fff0f3;
            color: #d9214e;
            border: 1px solid #ffc0cc;
        }

        /* ══════════════════════════════════════════
       WORK TIME (Plan → Aktual)
    ══════════════════════════════════════════ */
        .worktime-cell {
            min-width: 88px;
            padding: 4px 6px !important;
        }

        .plan-label {
            font-size: .6rem;
            color: #a1a5b7;
            font-weight: 600;
            text-transform: uppercase;
            display: block;
            margin-bottom: 1px;
        }

        .plan-val {
            font-size: .75rem;
            color: #5e6278;
            font-weight: 700;
            display: block;
            margin-bottom: 3px;
        }

        .actual-input {
            width: 100%;
            border: 1px solid #e4e6ef;
            border-radius: 4px;
            padding: 2px 5px;
            font-size: .75rem;
            font-weight: 700;
            color: #181c32;
            background: #f8f9ff;
            text-align: center;
            outline: none;
            transition: border-color .15s;
        }

        .actual-input:focus {
            border-color: #6366f1;
            background: #fff;
        }

        .actual-input.changed {
            border-color: #50cd89;
            background: #f0fff6;
        }

        .actual-tag {
            font-size: .58rem;
            color: #a1a5b7;
            display: block;
            text-align: center;
            margin-top: 1px;
        }

        /* Status result buttons */
        .result-cell {
            text-align: center;
        }

        .result-btn-group {
            display: flex;
            gap: 3px;
            justify-content: center;
        }

        .result-btn {
            width: 30px;
            height: 26px;
            border-radius: 5px;
            border: 1.5px solid #dee2e6;
            background: #fff;
            cursor: pointer;
            font-size: .65rem;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all .15s;
        }

        .result-btn:hover {
            transform: scale(1.1);
        }

        .result-btn.r-ok {
            border-color: #50cd89;
            color: #50cd89;
        }

        .result-btn.r-ng {
            border-color: #f1416c;
            color: #f1416c;
        }

        .result-btn.r-na {
            border-color: #b5b5c3;
            color: #b5b5c3;
        }

        .result-btn.r-ok.active {
            background: #50cd89;
            color: #fff;
            border-color: #50cd89;
            box-shadow: 0 2px 6px rgba(80, 205, 137, .4);
        }

        .result-btn.r-ng.active {
            background: #f1416c;
            color: #fff;
            border-color: #f1416c;
            box-shadow: 0 2px 6px rgba(241, 65, 108, .4);
        }

        .result-btn.r-na.active {
            background: #b5b5c3;
            color: #fff;
            border-color: #b5b5c3;
        }

        /* Inline inputs */
        .remarks-inline {
            border: none;
            background: transparent;
            width: 100%;
            font-size: .73rem;
            color: #444;
            outline: none;
            padding: 2px 0;
            border-bottom: 1px dashed #dee2e6;
        }

        .remarks-inline:focus {
            border-bottom-color: #6366f1;
            background: #f8f9ff;
            padding: 2px 4px;
        }

        .meas-inline {
            border: 1px solid #e4e6ef;
            border-radius: 4px;
            background: #f8f9ff;
            width: 100%;
            font-size: .73rem;
            padding: 2px 5px;
            outline: none;
            text-align: center;
        }

        .meas-inline:focus {
            border-color: #6366f1;
            background: #fff;
        }

        /* Photo & action */
        .photo-btn {
            border: 1.5px dashed #b5b5c3;
            border-radius: 4px;
            background: transparent;
            padding: 2px 7px;
            font-size: .65rem;
            cursor: pointer;
            color: #6c757d;
            transition: all .2s;
            display: inline-block;
        }

        .photo-btn:hover {
            border-color: #6366f1;
            color: #6366f1;
            background: #f0f0ff;
        }

        .photo-count {
            font-size: .65rem;
            color: #6366f1;
            font-weight: 700;
            cursor: pointer;
        }

        .action-toggle {
            width: 24px;
            height: 24px;
            border-radius: 4px;
            border: 1.5px solid #ffc107;
            background: transparent;
            cursor: pointer;
            font-size: .6rem;
            color: #ffc107;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: all .15s;
        }

        .action-toggle.active {
            background: #ffc107;
            color: #fff;
        }

        /* Expand row */
        .expand-row td {
            background: #fffef0 !important;
            padding: 8px 14px !important;
            border-top: none !important;
        }

        .expand-row {
            display: none;
        }

        .expand-row.show {
            display: table-row;
        }

        /* Save pill */
        .save-pill {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 3px 10px;
            border-radius: 999px;
            font-size: .72rem;
            font-weight: 600;
        }

        .save-pill.saving {
            background: #fff4de;
            color: #d07800;
        }

        .save-pill.saved {
            background: #e8fff3;
            color: #17773e;
        }

        .save-pill.err {
            background: #ffeef3;
            color: #d9214e;
        }
    </style>
@endpush

@section('content')

    <div class="content d-flex flex-column flex-column-fluid" id="kt_content">

        @include('partials.toolbar')

        <div class="post d-flex flex-column-fluid" id="kt_post">
            <div id="kt_content_container" class="container-xxl">
                {{-- ══ STICKY BAR ══ --}}
                <div class="work-sticky-bar">
                    <div class="container-fluid">
                        <div class="d-flex align-items-center gap-3 flex-wrap">
                            <div class="d-flex align-items-center gap-2">
                                <a href="{{ route('admin.records.index') }}" class="btn btn-sm btn-light">
                                    <i class="bi bi-arrow-left"></i>
                                </a>
                                <div>
                                    <div class="fw-bold text-gray-800 fs-7 lh-1">{{ $record->record_number }}</div>
                                    <div class="text-muted fs-8">{{ $record->equipment_name }} · {{ $record->pm_cycle }}
                                    </div>
                                </div>
                            </div>
                            <div class="d-flex align-items-center gap-2 flex-grow-1" style="max-width:280px">
                                <div class="progress-track">
                                    <div class="progress-fill" id="progressBar" style="width:{{ $progress['percent'] }}%">
                                    </div>
                                </div>
                                <span class="text-muted fs-8 text-nowrap" id="progressText">
                                    {{ $progress['done'] }}/{{ $progress['total'] }}
                                </span>
                            </div>
                            <div class="d-none d-md-flex gap-3 fs-8">
                                <span><span class="fw-bold text-success" id="statOk">{{ $progress['ok'] }}</span> <span
                                        class="text-muted">OK</span></span>
                                <span><span class="fw-bold text-danger" id="statNg">{{ $progress['ng'] }}</span> <span
                                        class="text-muted">NG</span></span>
                                <span><span class="fw-bold text-muted" id="statPending">{{ $progress['pending'] }}</span>
                                    <span class="text-muted">Pending</span></span>
                            </div>
                            <div id="saveIndicator"></div>
                            <div class="ms-auto d-flex gap-2 align-items-center">
                                <span class="badge bg-primary" id="progressPct">{{ $progress['percent'] }}%</span>
                                <button class="btn btn-sm btn-success" id="btnComplete"
                                    {{ $progress['percent'] < 100 ? 'disabled' : '' }} onclick="openCompleteModal()">
                                    <i class="bi bi-check-circle me-1"></i>Selesaikan PM
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {{-- ══ HEADER CHECK SHEET ══ --}}
                <div class="cs-header">
                    <div class="cs-header-top">
                        <div class="fw-bold fs-6">
                            <i class="bi bi-file-earmark-check me-2"></i>Preventive Maintenance Check Sheet
                        </div>
                        <div class="text-end">
                            <div style="font-size:.68rem;opacity:.6">Doc No</div>
                            <div class="fw-bold fs-7">{{ $record->doc_number }}</div>
                        </div>
                    </div>
                    <div class="cs-header-grid">
                        <div class="cs-header-cell">
                            <div class="lbl">Equipment</div>
                            <div class="val">{{ $record->equipment_name }}</div>
                        </div>
                        <div class="cs-header-cell">
                            <div class="lbl">PM Number</div>
                            <div class="val">{{ $record->pm_number ?? '—' }}</div>
                        </div>
                        <div class="cs-header-cell">
                            <div class="lbl">Equ. No</div>
                            <div class="val">{{ $record->equipment_code }}</div>
                        </div>
                    </div>
                    <div class="cs-header-grid" style="border-top:1px solid #dee2e6">
                        <div class="cs-header-cell">
                            <div class="lbl">ETM Group</div>
                            <div class="val">{{ $record->etm_group }}</div>
                        </div>
                        <div class="cs-header-cell">
                            <div class="lbl">TIS Number</div>
                            <div class="val">{{ $record->tis_number ?? '—' }}</div>
                        </div>
                        <div class="cs-header-cell d-flex gap-4">
                            <div>
                                <div class="lbl">Year</div>
                                <div class="val">{{ date('Y', strtotime($record->maintenance_date)) }}</div>
                            </div>
                            <div>
                                <div class="lbl">PM Cycle</div>
                                <div class="val"><span class="badge badge-light-primary">{{ $record->pm_cycle }}</span>
                                </div>
                            </div>
                            <div>
                                <div class="lbl">PM Status</div>
                                <div class="val"><span class="badge badge-light-warning">In Progress</span></div>
                            </div>
                        </div>
                    </div>
                    <div class="cs-header-grid" style="border-top:1px solid #dee2e6">
                        <div class="cs-header-cell">
                            <div class="lbl">Prepared by (Teknisi)</div>
                            <div class="val">{{ $record->technician_name }}</div>
                        </div>
                        <div class="cs-header-cell">
                            <div class="lbl">Tanggal · Waktu Mulai</div>
                            <div class="val">{{ \Carbon\Carbon::parse($record->maintenance_date)->format('d M Y') }} ·
                                {{ $record->start_time }}</div>
                        </div>
                        <div class="cs-header-cell">
                            <div class="lbl">Checked by</div>
                            <div class="val text-muted">{{ $record->checker_name ?? '(menunggu)' }}</div>
                        </div>
                    </div>
                </div>

                {{-- Legend --}}
                <div class="d-flex flex-wrap gap-3 py-3 px-1 align-items-center fs-8">
                    <span class="fw-bold text-muted">Status hasil:</span>
                    <span><span
                            style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#50cd89;margin-right:4px"></span><strong>OK</strong>
                        Sesuai standar</span>
                    <span><span
                            style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#f1416c;margin-right:4px"></span><strong>NG</strong>
                        Tidak sesuai standar</span>
                    <span><span
                            style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#b5b5c3;margin-right:4px"></span><strong>N/A</strong>
                        Tidak berlaku</span>
                    <span class="ms-3 fw-bold text-muted">PM Type:</span>
                    <span class="pm-legend plan"><span style="font-size:.7rem">■</span> Wajib (plan)</span>
                    <span class="pm-legend done"><span style="font-size:.7rem">✓</span> Sudah dikerjakan</span>
                    <span class="pm-legend extra"><span style="font-size:.7rem">✓</span> Extra (diluar plan)</span>
                    <span class="pm-legend skip"><span style="font-size:.7rem">!</span> Belum dikerjakan</span>
                </div>

                {{-- ══ TABEL CHECK SHEET ══ --}}
                <div class="cs-table-wrap">
                    <table class="cs-table" id="csTable">
                        <thead>
                            <tr>
                                <th rowspan="2" class="th-left" style="width:32px">No.</th>
                                <th rowspan="2" class="th-left" style="min-width:100px">Sub Equip.</th>
                                <th rowspan="2" class="th-left" style="min-width:180px">Check Item</th>
                                <th rowspan="2" class="th-left" style="min-width:175px">Maintenance Standard</th>
                                {{-- PM Type group --}}
                                <th colspan="1" style="border-left:2px solid #3d6494; min-width:210px">
                                    PM Type
                                    <div style="font-size:.58rem;font-weight:400;opacity:.75">
                                        ■ = wajib dari template · centang = sudah dikerjakan
                                    </div>
                                </th>
                                {{-- Work Time --}}
                                <th colspan="2" style="border-left:2px solid #3d6494">
                                    Work Time
                                    <div style="font-size:.58rem;font-weight:400;opacity:.75">Plan → Aktual</div>
                                </th>
                                {{-- Hasil --}}
                                <th colspan="2" style="border-left:2px solid #3d6494; min-width:150px">
                                    Hasil Pemeriksaan
                                    <div style="font-size:.6rem;font-weight:400;opacity:.8">
                                        {{ \Carbon\Carbon::parse($record->maintenance_date)->format('d/m/Y') }}
                                    </div>
                                </th>
                                <th rowspan="2" style="min-width:135px;border-left:2px solid #3d6494">Keterangan /
                                    Remarks</th>
                                <th rowspan="2" style="min-width:54px;border-left:2px solid #3d6494">Foto</th>
                                <th rowspan="2" style="min-width:38px;border-left:2px solid #3d6494"
                                    title="Perlu Tindakan Lanjut">⚠</th>
                            </tr>
                            <tr>
                                <th
                                    style="border-left:2px solid #3d6494;font-size:.62rem;text-align:left;padding-left:10px">
                                    Check · Lubricate · Cleaning · Tighten · Measure · Replace
                                </th>
                                <th style="width:82px;border-left:2px solid #3d6494;font-size:.62rem">Man Power<br><span
                                        style="opacity:.7">(orang)</span></th>
                                <th style="width:82px;font-size:.62rem">Time<br><span style="opacity:.7">(menit)</span>
                                </th>
                                <th style="width:74px;border-left:2px solid #3d6494">Status</th>
                                <th style="width:78px;font-size:.62rem">Nilai Ukur</th>
                            </tr>
                        </thead>

                        <tbody id="csBody">
                            @php
                                $lastSubEq = '__INIT__';
                                $pmCols = ['Check', 'Lubricate', 'Cleaning', 'Tighten', 'Measure', 'Replace'];
                            @endphp

                            @foreach ($items as $item)
                                @if ($item->sub_equipment !== $lastSubEq)
                                    <tr class="sub-eq-row">
                                        <td colspan="13">
                                            <i class="bi bi-gear-fill me-2 text-primary opacity-75"
                                                style="font-size:.68rem"></i>
                                            {{ $item->sub_equipment ?: 'General' }}
                                        </td>
                                    </tr>
                                    @php $lastSubEq = $item->sub_equipment; @endphp
                                @endif

                                @php
                                    $planTypes = $item->pm_types ?? []; // dari template (wajib)
                                    $doneTypes = $item->completed_pm_types ?? []; // sudah dikerjakan teknisi
                                    $hasMeas = in_array('Measure', $planTypes);
                                    $measData = $item->measurements;
                                    $photos = $item->photos ?? [];
                                    $st = $item->status;
                                    $actualMp = $item->actual_man_power ?? null;
                                    $actualTime = $item->actual_time_minutes ?? null;
                                @endphp

                                <tr class="item-row st-{{ $st }}" id="row-{{ $item->id }}"
                                    data-item="{{ $item->id }}">

                                    {{-- No --}}
                                    <td class="text-center fw-bold" style="color:#6c757d;font-size:.75rem">
                                        {{ $item->item_number }}</td>

                                    {{-- Sub Equipment --}}
                                    <td class="text-muted" style="font-size:.72rem">{{ $item->sub_equipment }}</td>

                                    {{-- Check Item --}}
                                    <td>
                                        <div class="fw-semibold" style="line-height:1.3;font-size:.78rem">
                                            {{ $item->check_item }}</div>
                                    </td>

                                    {{-- Maintenance Standard --}}
                                    <td style="font-size:.71rem;color:#5e6278;line-height:1.3">
                                        {{ $item->maintenance_standard }}</td>

                                    {{-- ══ PM TYPE CHECKLIST ══ --}}
                                    <td class="pm-cell" style="border-left:2px solid #dee2e6">
                                        <div class="pm-cell-inner" id="pmGroup-{{ $item->id }}">
                                            @foreach ($pmCols as $col)
                                                @php
                                                    $isPlan = in_array($col, $planTypes);
                                                    $isDone = in_array($col, $doneTypes);
                                                    $isExtra = $isDone && !$isPlan; // dikerjakan tapi bukan plan
                                                    $isSkip = $isPlan && !$isDone && $st !== 'pending'; // plan tapi belum centang
                                                @endphp
                                                <div class="pm-check-wrap">
                                                    <input type="checkbox"
                                                        class="pm-checkbox
                            {{ $isPlan ? 'is-plan' : 'is-extra' }}
                            {{ $isDone ? 'is-done' : '' }}
                            {{ $isSkip ? 'is-skipped' : '' }}"
                                                        id="pmt-{{ $item->id }}-{{ $col }}"
                                                        data-item="{{ $item->id }}" data-col="{{ $col }}"
                                                        data-is-plan="{{ $isPlan ? '1' : '0' }}"
                                                        {{ $isDone ? 'checked' : '' }}
                                                        onchange="togglePmType({{ $item->id }}, '{{ $col }}', this)"
                                                        title="{{ $col }}{{ $isPlan ? ' (wajib dari template)' : ' (extra)' }}">
                                                    <span class="pm-type-label">{{ Str::limit($col, 5) }}</span>
                                                </div>
                                            @endforeach
                                        </div>
                                        {{-- Warning jika ada plan yang belum dicentang --}}
                                        @php
                                            $skippedPlans = array_filter(
                                                $planTypes,
                                                fn($p) => !in_array($p, $doneTypes),
                                            );
                                        @endphp
                                        <div class="pm-skip-warn fs-8 text-danger mt-1 {{ count($skippedPlans) > 0 && $st !== 'pending' ? '' : 'd-none' }}"
                                            id="pmWarn-{{ $item->id }}">
                                            <i class="bi bi-exclamation-triangle me-1"></i>
                                            <span id="pmWarnTxt-{{ $item->id }}">
                                                {{ count($skippedPlans) }} PM Type belum dicentang
                                            </span>
                                        </div>
                                    </td>

                                    {{-- ══ Man Power Plan → Aktual ══ --}}
                                    <td class="worktime-cell" style="border-left:2px solid #dee2e6">
                                        <span class="plan-label">Plan</span>
                                        <span class="plan-val">{{ $item->man_power }} org</span>
                                        <input type="number"
                                            class="actual-input mp-input {{ $actualMp ? 'changed' : '' }}"
                                            id="mp-{{ $item->id }}" min="1" max="99"
                                            placeholder="{{ $item->man_power }}" value="{{ $actualMp ?? '' }}"
                                            data-plan="{{ $item->man_power }}" data-item="{{ $item->id }}"
                                            onblur="saveActualMp({{ $item->id }}, this)"
                                            title="Aktual jumlah teknisi">
                                        <span class="actual-tag">aktual</span>
                                    </td>

                                    {{-- ══ Time Plan → Aktual ══ --}}
                                    <td class="worktime-cell">
                                        <span class="plan-label">Plan</span>
                                        <span class="plan-val">{{ $item->time_minutes }} mnt</span>
                                        <input type="number"
                                            class="actual-input time-input {{ $actualTime ? 'changed' : '' }}"
                                            id="time-{{ $item->id }}" min="1" max="9999"
                                            placeholder="{{ $item->time_minutes }}" value="{{ $actualTime ?? '' }}"
                                            data-plan="{{ $item->time_minutes }}" data-item="{{ $item->id }}"
                                            onblur="saveActualTime({{ $item->id }}, this)"
                                            title="Aktual waktu pengerjaan (menit)">
                                        <span class="actual-tag">aktual (mnt)</span>
                                    </td>

                                    {{-- Status Result --}}
                                    <td class="result-cell" style="border-left:2px solid #dee2e6">
                                        <div class="result-btn-group">
                                            <button class="result-btn r-ok {{ $st === 'ok' ? 'active' : '' }}"
                                                onclick="setStatus({{ $item->id }}, 'ok',  this)"
                                                title="OK — Sesuai standar">OK</button>
                                            <button class="result-btn r-ng {{ $st === 'ng' ? 'active' : '' }}"
                                                onclick="setStatus({{ $item->id }}, 'ng',  this)"
                                                title="NG — Tidak sesuai standar">NG</button>
                                            <button class="result-btn r-na {{ $st === 'na' ? 'active' : '' }}"
                                                onclick="setStatus({{ $item->id }}, 'na',  this)"
                                                title="N/A — Tidak berlaku">NA</button>
                                        </div>
                                    </td>

                                    {{-- Nilai Ukur --}}
                                    <td>
                                        @if ($hasMeas)
                                            <input type="text" class="meas-inline" placeholder="nilai..."
                                                value="{{ is_array($measData) ? $measData['value'] ?? '' : '' }}"
                                                data-item="{{ $item->id }}"
                                                onblur="saveMeasurement({{ $item->id }}, this.value)">
                                        @else
                                            <span class="text-muted" style="font-size:.65rem">—</span>
                                        @endif
                                    </td>

                                    {{-- Remarks --}}
                                    <td style="border-left:2px solid #dee2e6">
                                        <input type="text" class="remarks-inline remarks-input"
                                            placeholder="keterangan..." value="{{ $item->remarks ?? '' }}"
                                            data-item="{{ $item->id }}"
                                            onblur="saveRemarks({{ $item->id }}, this.value)">
                                    </td>

                                    {{-- Foto --}}
                                    <td class="text-center" style="border-left:2px solid #dee2e6">
                                        <div class="d-flex flex-column align-items-center gap-1">
                                            <label class="photo-btn mb-0" style="cursor:pointer" title="Upload foto">
                                                <i class="bi bi-camera"></i>
                                                <input type="file" accept="image/*" style="display:none"
                                                    onchange="uploadPhoto({{ $item->id }}, this)">
                                            </label>
                                            <span class="photo-count {{ count($photos) === 0 ? 'd-none' : '' }}"
                                                id="photoCount-{{ $item->id }}"
                                                onclick="toggleExpand({{ $item->id }})">
                                                <i class="bi bi-images"></i> {{ count($photos) ?: '' }}
                                            </span>
                                        </div>
                                    </td>

                                    {{-- Action required --}}
                                    <td class="text-center" style="border-left:2px solid #dee2e6">
                                        <button class="action-toggle {{ $item->requires_action ? 'active' : '' }}"
                                            id="actBtn-{{ $item->id }}"
                                            onclick="toggleAction({{ $item->id }}, this)"
                                            title="Perlu tindakan lanjut">
                                            <i class="bi bi-wrench"></i>
                                        </button>
                                    </td>
                                </tr>

                                {{-- Expand row: foto + action --}}
                                <tr class="expand-row {{ $item->requires_action || count($photos) > 0 ? 'show' : '' }}"
                                    id="expand-{{ $item->id }}">
                                    <td colspan="13">
                                        <div class="d-flex flex-wrap gap-4 align-items-start">
                                            <div>
                                                <div class="text-muted fw-semibold mb-1" style="font-size:.7rem">
                                                    <i class="bi bi-images me-1"></i>Foto
                                                </div>
                                                <div class="d-flex gap-2 flex-wrap" id="photoList-{{ $item->id }}">
                                                    @foreach ($photos as $ph)
                                                        <img src="{{ $ph['url'] }}"
                                                            onclick="previewPhoto('{{ $ph['url'] }}')"
                                                            style="width:56px;height:56px;object-fit:cover;
                                   border-radius:5px;border:1.5px solid #dee2e6;cursor:pointer">
                                                    @endforeach
                                                </div>
                                            </div>
                                            <div id="actionDetail-{{ $item->id }}"
                                                class="{{ $item->requires_action ? '' : 'd-none' }} flex-grow-1">
                                                <div class="text-warning fw-semibold mb-1" style="font-size:.7rem">
                                                    <i class="bi bi-exclamation-triangle me-1"></i>Tindakan yang Diperlukan
                                                </div>
                                                <input type="text" class="form-control form-control-sm"
                                                    id="actionInput-{{ $item->id }}"
                                                    placeholder="Deskripsikan tindakan lanjut..."
                                                    value="{{ $item->action_required ?? '' }}"
                                                    onblur="saveAction({{ $item->id }}, this.value)"
                                                    style="border-color:#ffc107;max-width:400px">
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>

                        <tfoot>
                            <tr style="background:#f5f8fa">
                                <td colspan="4" class="text-center py-3 fw-bold"
                                    style="font-size:.78rem;color:#1e3a5f">
                                    Checker
                                    <div class="fw-normal text-muted mt-1" style="min-height:24px">
                                        {{ $record->checker_name ?? '' }}
                                    </div>
                                </td>
                                <td colspan="6"></td>
                                <td colspan="3" class="text-center py-3 fw-bold"
                                    style="font-size:.78rem;color:#1e3a5f;border-left:2px solid #dee2e6">
                                    TL Validation
                                    <div class="fw-normal text-muted mt-1" style="min-height:24px">
                                        {{ $record->validator_name ?? '' }}
                                    </div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {{-- Summary plan vs aktual --}}
                <div class="card card-flush border-0 shadow-sm mt-4">
                    <div class="card-body py-4 px-5">
                        <div class="row g-4 align-items-center">
                            <div class="col-md-4">
                                <div class="fw-bold text-gray-800 mb-1">Ringkasan Waktu & Tenaga</div>
                                <div class="text-muted fs-8">Plan dari template vs aktual yang diisi</div>
                            </div>
                            <div class="col-md-8">
                                <div class="row g-3 text-center">
                                    <div class="col-3">
                                        <div class="text-muted fs-8 mb-1">Man Power Plan</div>
                                        <div class="fw-bold fs-4 text-gray-800" id="sumMpPlan">
                                            {{ $items->sum('man_power') }}</div>
                                        <div class="text-muted fs-8">orang</div>
                                    </div>
                                    <div class="col-3">
                                        <div class="text-muted fs-8 mb-1">Man Power Aktual</div>
                                        <div class="fw-bold fs-4 text-primary" id="sumMpActual">
                                            {{ $items->sum('actual_man_power') ?: '—' }}</div>
                                        <div class="text-muted fs-8">orang</div>
                                    </div>
                                    <div class="col-3">
                                        <div class="text-muted fs-8 mb-1">Time Plan</div>
                                        <div class="fw-bold fs-4 text-gray-800" id="sumTimePlan">
                                            {{ $items->sum('time_minutes') }}</div>
                                        <div class="text-muted fs-8">menit</div>
                                    </div>
                                    <div class="col-3">
                                        <div class="text-muted fs-8 mb-1">Time Aktual</div>
                                        <div class="fw-bold fs-4 text-primary" id="sumTimeActual">
                                            {{ $items->sum('actual_time_minutes') ?: '—' }}</div>
                                        <div class="text-muted fs-8">menit</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {{-- NG Summary --}}
                <div id="ngSummary" class="mt-4" style="{{ $progress['ng'] > 0 ? '' : 'display:none' }}">
                    <div class="alert alert-light-danger border border-danger border-dashed">
                        <div class="fw-bold text-danger mb-2">
                            <i class="bi bi-exclamation-triangle me-2"></i>Item NG — <span
                                id="ngCount">{{ $progress['ng'] }}</span> item
                        </div>
                        <div id="ngList">
                            @foreach ($items->where('status', 'ng') as $ngItem)
                                <div class="d-flex align-items-center gap-2 mb-1">
                                    <span class="badge badge-light-danger">{{ $ngItem->item_number }}</span>
                                    <span class="fs-8">{{ $ngItem->check_item }}</span>
                                </div>
                            @endforeach
                        </div>
                    </div>
                </div>

                <div class="mb-10 d-lg-none"></div>

                {{-- Mobile float --}}
                <div class="d-lg-none position-fixed bottom-0 start-0 end-0 p-3"
                    style="background:rgba(255,255,255,.95);border-top:1px solid #eff2f5;z-index:150">
                    <button class="btn btn-success w-100" id="btnCompleteMobile"
                        {{ $progress['percent'] < 100 ? 'disabled' : '' }} onclick="openCompleteModal()">
                        <i class="bi bi-check-circle me-1"></i>
                        Selesaikan PM · <span id="mobilePct">{{ $progress['percent'] }}</span>%
                    </button>
                </div>

                {{-- Modal Photo Preview --}}
                <div class="modal fade" id="photoModal" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content border-0">
                            <div class="modal-header border-0 pb-0">
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body text-center">
                                <img id="previewImg" src="" class="img-fluid rounded" style="max-height:75vh">
                            </div>
                        </div>
                    </div>
                </div>

                {{-- Modal Konfirmasi Selesai --}}
                <div class="modal fade" id="completeModal" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content border-0 shadow">
                            <div class="modal-header border-0 pb-2">
                                <h5 class="modal-title fw-bold">
                                    <i class="bi bi-check-circle-fill text-success me-2"></i>Selesaikan Pengerjaan PM?
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body pt-0">
                                <div class="row g-3 text-center mb-4">
                                    <div class="col-4">
                                        <div class="fs-1 fw-bold text-success" id="mOk">{{ $progress['ok'] }}
                                        </div>
                                        <div class="text-muted fs-8">OK</div>
                                    </div>
                                    <div class="col-4">
                                        <div class="fs-1 fw-bold text-danger" id="mNg">{{ $progress['ng'] }}</div>
                                        <div class="text-muted fs-8">NG</div>
                                    </div>
                                    <div class="col-4">
                                        <div class="fs-1 fw-bold text-muted" id="mNa">
                                            {{ $items->where('status', 'na')->count() }}</div>
                                        <div class="text-muted fs-8">N/A</div>
                                    </div>
                                </div>
                                <div id="pmSkipAlert" style="display:none"
                                    class="alert alert-light-warning border border-warning border-dashed fs-8 mb-3">
                                    <i class="bi bi-exclamation-triangle me-1"></i>
                                    <strong>Ada PM Type yang belum dicentang</strong> —
                                    pastikan semua pekerjaan yang wajib sudah dilakukan.
                                </div>
                                <div id="deviationAlert" style="display:none"
                                    class="alert alert-light-info border border-info border-dashed fs-8 mb-3">
                                    <i class="bi bi-info-circle me-1"></i>
                                    Ada deviasi waktu/tenaga dari plan. Pastikan sudah diisi dengan benar.
                                </div>
                                <div class="alert alert-light-secondary fs-8 mb-0">
                                    <i class="bi bi-info-circle me-1"></i>
                                    Setelah diselesaikan, record dikirim ke Checker untuk divalidasi.
                                </div>
                            </div>
                            <div class="modal-footer border-0 pt-0">
                                <button type="button" class="btn btn-light" data-bs-dismiss="modal">Batal</button>
                                <form method="POST"
                                    action="{{ route('admin.records.complete', $record->id) }}">
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
        const CSRF = '{{ csrf_token() }}';
        const BASE_URL = '{{ url('/admin/records') }}';
        const debounce = {};

        // ── Set Status ────────────────────────────────────────────
        function setStatus(itemId, status, btn) {
            const row = document.getElementById('row-' + itemId);
            row.className = row.className.replace(/\bst-\w+/g, '').trim();
            row.classList.add('st-' + status);
            row.querySelectorAll('.result-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update skip warning state setelah status berubah
            refreshPmSkipState(itemId);
            saveItem(itemId, {
                status
            });
        }

        // ── Toggle PM Type checkbox ───────────────────────────────
        function togglePmType(itemId, col, checkbox) {
            const isDone = checkbox.checked;
            const isPlan = checkbox.dataset.isPlan === '1';

            // Reset classes
            checkbox.classList.remove('is-done', 'is-skipped');
            if (isDone) {
                checkbox.classList.add('is-done');
            } else if (isPlan) {
                const row = document.getElementById('row-' + itemId);
                const st = getRowStatus(row);
                if (st !== 'pending') checkbox.classList.add('is-skipped');
            }

            refreshPmSkipState(itemId);

            // Kumpulkan semua yang sudah dicentang
            const doneTypes = getPmDoneTypes(itemId);
            saveItem(itemId, {
                completed_pm_types: doneTypes
            });
        }

        // ── Ambil daftar PM Type yang sudah dicentang ─────────────
        function getPmDoneTypes(itemId) {
            const result = [];
            document.querySelectorAll(`#pmGroup-${itemId} .pm-checkbox`).forEach(cb => {
                if (cb.checked) result.push(cb.dataset.col);
            });
            return result;
        }

        // ── Refresh tampilan skip warning per item ────────────────
        function refreshPmSkipState(itemId) {
            const row = document.getElementById('row-' + itemId);
            const st = getRowStatus(row);
            let skips = 0;

            document.querySelectorAll(`#pmGroup-${itemId} .pm-checkbox.is-plan`).forEach(cb => {
                cb.classList.remove('is-skipped');
                if (!cb.checked && st !== 'pending') {
                    cb.classList.add('is-skipped');
                    skips++;
                }
            });

            const warn = document.getElementById('pmWarn-' + itemId);
            const warnTxt = document.getElementById('pmWarnTxt-' + itemId);
            if (warn) {
                warn.classList.toggle('d-none', skips === 0 || st === 'pending');
                if (warnTxt) warnTxt.textContent = skips + ' PM Type belum dicentang';
            }
        }

        // ── Helper: ambil status dari class row ───────────────────
        function getRowStatus(row) {
            if (row.classList.contains('st-ok')) return 'ok';
            if (row.classList.contains('st-ng')) return 'ng';
            if (row.classList.contains('st-na')) return 'na';
            return 'pending';
        }

        // ── Save Remarks ──────────────────────────────────────────
        function saveRemarks(itemId, value) {
            clearTimeout(debounce['r' + itemId]);
            debounce['r' + itemId] = setTimeout(() => saveItem(itemId, {
                remarks: value
            }), 700);
        }

        // ── Save Measurement ──────────────────────────────────────
        function saveMeasurement(itemId, value) {
            clearTimeout(debounce['m' + itemId]);
            debounce['m' + itemId] = setTimeout(() => saveItem(itemId, {
                measurements: {
                    value
                }
            }), 700);
        }

        // ── Save Actual Man Power ─────────────────────────────────
        function saveActualMp(itemId, el) {
            const val = el.value ? parseInt(el.value) : null;
            el.classList.toggle('changed', val !== null && val !== parseInt(el.dataset.plan));
            clearTimeout(debounce['mp' + itemId]);
            debounce['mp' + itemId] = setTimeout(() => {
                saveItem(itemId, {
                    actual_man_power: val
                });
                recalcSummary();
            }, 700);
        }

        // ── Save Actual Time ──────────────────────────────────────
        function saveActualTime(itemId, el) {
            const val = el.value ? parseInt(el.value) : null;
            el.classList.toggle('changed', val !== null && val !== parseInt(el.dataset.plan));
            clearTimeout(debounce['t' + itemId]);
            debounce['t' + itemId] = setTimeout(() => {
                saveItem(itemId, {
                    actual_time_minutes: val
                });
                recalcSummary();
            }, 700);
        }

        // ── Toggle Action Required ────────────────────────────────
        function toggleAction(itemId, btn) {
            const isActive = btn.classList.toggle('active');
            const detail = document.getElementById('actionDetail-' + itemId);
            const expand = document.getElementById('expand-' + itemId);
            isActive ? detail.classList.remove('d-none') : detail.classList.add('d-none');
            if (isActive) expand.classList.add('show');
            else {
                const photos = document.getElementById('photoList-' + itemId);
                if (!photos || photos.children.length === 0) expand.classList.remove('show');
            }
            saveItem(itemId, {
                requires_action: isActive
            });
        }

        function saveAction(itemId, value) {
            saveItem(itemId, {
                action_required: value
            });
        }

        function toggleExpand(itemId) {
            document.getElementById('expand-' + itemId).classList.toggle('show');
        }

        // ── Upload Photo ──────────────────────────────────────────
        function uploadPhoto(itemId, input) {
            if (!input.files?.length) return;
            const fd = new FormData();
            fd.append('photo', input.files[0]);
            fd.append('_token', CSRF);
            showSave('saving', 'Mengupload foto...');
            $.ajax({
                url: `${BASE_URL}/${RECORD_ID}/upload-photo/${itemId}`,
                method: 'POST',
                data: fd,
                processData: false,
                contentType: false,
                success(res) {
                    if (!res.success) return showSave('err', 'Gagal upload');
                    const list = document.getElementById('photoList-' + itemId);
                    const img = Object.assign(document.createElement('img'), {
                        src: res.photo.url,
                        onclick: () => previewPhoto(res.photo.url),
                    });
                    img.style.cssText =
                        'width:56px;height:56px;object-fit:cover;border-radius:5px;border:1.5px solid #dee2e6;cursor:pointer';
                    list.appendChild(img);
                    const badge = document.getElementById('photoCount-' + itemId);
                    if (badge) {
                        badge.innerHTML = `<i class="bi bi-images"></i> ${list.children.length}`;
                        badge.classList.remove('d-none');
                    }
                    document.getElementById('expand-' + itemId).classList.add('show');
                    showSave('ok', 'Foto tersimpan');
                },
                error() {
                    showSave('err', 'Gagal upload foto');
                }
            });
            input.value = '';
        }

        function previewPhoto(url) {
            document.getElementById('previewImg').src = url;
            new bootstrap.Modal(document.getElementById('photoModal')).show();
        }

        // ── Core AJAX Save ────────────────────────────────────────
        function saveItem(itemId, overrides) {
            showSave('saving', 'Menyimpan...');
            const row = document.getElementById('row-' + itemId);
            const activeBtn = row.querySelector('.result-btn.active');
            const status = activeBtn ?
                (activeBtn.classList.contains('r-ok') ? 'ok' : activeBtn.classList.contains('r-ng') ? 'ng' : 'na') :
                'pending';

            const payload = Object.assign({
                status,
                remarks: row.querySelector('.remarks-input')?.value ?? '',
                measurements: row.querySelector('.meas-inline') ? {
                    value: row.querySelector('.meas-inline').value
                } : null,
                requires_action: document.getElementById('actBtn-' + itemId)?.classList.contains('active') ?? false,
                action_required: document.getElementById('actionInput-' + itemId)?.value ?? '',
                actual_man_power: document.getElementById('mp-' + itemId)?.value ? parseInt(document.getElementById(
                    'mp-' + itemId).value) : null,
                actual_time_minutes: document.getElementById('time-' + itemId)?.value ? parseInt(document
                    .getElementById('time-' + itemId).value) : null,
                completed_pm_types: getPmDoneTypes(itemId),
            }, overrides);

            $.ajax({
                url: `${BASE_URL}/${RECORD_ID}/items/${itemId}`,
                method: 'PUT',
                data: JSON.stringify(payload),
                contentType: 'application/json',
                headers: {
                    'X-CSRF-TOKEN': CSRF,
                    'Accept': 'application/json'
                },
                success(res) {
                    if (res.success) {
                        showSave('ok', 'Tersimpan');
                        updateProgress(res.progress);
                        rebuildNgList();
                    } else showSave('err', 'Gagal simpan');
                },
                error() {
                    showSave('err', 'Gagal simpan');
                }
            });
        }

        // ── Update Progress ───────────────────────────────────────
        function updateProgress(prog) {
            document.getElementById('progressBar').style.width = prog.percent + '%';
            document.getElementById('progressText').textContent = prog.done + '/' + prog.total;
            document.getElementById('progressPct').textContent = prog.percent + '%';
            document.getElementById('mobilePct').textContent = prog.percent;
            document.getElementById('btnComplete').disabled = prog.percent < 100;
            const mob = document.getElementById('btnCompleteMobile');
            if (mob) mob.disabled = prog.percent < 100;

            let ok = 0,
                ng = 0,
                na = 0,
                pending = 0;
            document.querySelectorAll('.item-row').forEach(r => {
                if (r.classList.contains('st-ok')) ok++;
                else if (r.classList.contains('st-ng')) ng++;
                else if (r.classList.contains('st-na')) na++;
                else pending++;
            });
            ['statOk', 'statNg', 'statPending'].forEach((id, i) => {
                document.getElementById(id).textContent = [ok, ng, pending][i];
            });
            ['mOk', 'mNg', 'mNa'].forEach((id, i) => {
                const el = document.getElementById(id);
                if (el) el.textContent = [ok, ng, na][i];
            });
            document.getElementById('ngSummary').style.display = ng > 0 ? '' : 'none';
            document.getElementById('ngCount').textContent = ng;
        }

        // ── Rebuild NG list ───────────────────────────────────────
        function rebuildNgList() {
            const list = document.getElementById('ngList');
            if (!list) return;
            list.innerHTML = '';
            document.querySelectorAll('.item-row.st-ng').forEach(row => {
                const num = row.querySelector('td:first-child').textContent.trim();
                const name = row.querySelector('td:nth-child(3) .fw-semibold')?.textContent?.trim() ?? '';
                const d = document.createElement('div');
                d.className = 'd-flex align-items-center gap-2 mb-1';
                d.innerHTML =
                    `<span class="badge badge-light-danger">${num}</span><span class="fs-8">${name}</span>`;
                list.appendChild(d);
            });
        }

        // ── Hitung summary plan vs aktual ────────────────────────
        function recalcSummary() {
            let sumMp = 0,
                sumTime = 0,
                hasDev = false,
                hasPmSkip = false;
            document.querySelectorAll('.mp-input').forEach(el => {
                const v = el.value ? parseInt(el.value) : 0;
                sumMp += v;
                if (el.value && v !== parseInt(el.dataset.plan)) hasDev = true;
            });
            document.querySelectorAll('.time-input').forEach(el => {
                const v = el.value ? parseInt(el.value) : 0;
                sumTime += v;
                if (el.value && v !== parseInt(el.dataset.plan)) hasDev = true;
            });
            // Cek ada PM skip?
            document.querySelectorAll('.pm-checkbox.is-skipped').forEach(() => {
                hasPmSkip = true;
            });

            const mpEl = document.getElementById('sumMpActual');
            const timeEl = document.getElementById('sumTimeActual');
            if (mpEl) mpEl.textContent = sumMp > 0 ? sumMp : '—';
            if (timeEl) timeEl.textContent = sumTime > 0 ? sumTime : '—';

            const devA = document.getElementById('deviationAlert');
            const skipA = document.getElementById('pmSkipAlert');
            if (devA) devA.style.display = hasDev ? '' : 'none';
            if (skipA) skipA.style.display = hasPmSkip ? '' : 'none';
        }

        // ── Open modal ────────────────────────────────────────────
        function openCompleteModal() {
            recalcSummary();
            new bootstrap.Modal(document.getElementById('completeModal')).show();
        }

        // ── Save indicator ────────────────────────────────────────
        let saveTimer;

        function showSave(type, msg) {
            const el = document.getElementById('saveIndicator');
            const cls = {
                saving: 'saving',
                ok: 'saved',
                err: 'err'
            } [type];
            const ico = {
                saving: 'arrow-repeat spin',
                ok: 'check-circle',
                err: 'x-circle'
            } [type];
            clearTimeout(saveTimer);
            el.innerHTML = `<span class="save-pill ${cls}"><i class="bi bi-${ico} me-1"></i>${msg}</span>`;
            if (type !== 'saving') saveTimer = setTimeout(() => {
                el.innerHTML = '';
            }, 2500);
        }

        // Spin CSS
        const s = document.createElement('style');
        s.textContent =
            '.spin{animation:_sp .6s linear infinite;display:inline-block}@keyframes _sp{to{transform:rotate(360deg)}}';
        document.head.appendChild(s);

        // Init
        recalcSummary();

        // Refresh semua skip state on load (untuk item yang sudah punya status)
        document.querySelectorAll('.item-row:not(.st-pending)').forEach(row => {
            const itemId = row.dataset.item;
            if (itemId) refreshPmSkipState(parseInt(itemId));
        });
    </script>
@endpush
