@extends('layouts.app')

@section('title')
    Jadwal Preventive Maintenance Record
@endsection
@section('subtitle')
    List Jadwal Preventive Maintenance Record
@endsection
@section('menuUtama')
    Menu Utama
@endsection
@section('menuItem')
    Maintenance Record
@endsection

@section('content')

<div class="content d-flex flex-column flex-column-fluid" id="kt_content">

    @include('partials.toolbar')

    <div class="post d-flex flex-column-fluid" id="kt_post">
        <div id="kt_content_container" class="container-xxl">

            <div class="d-flex align-items-center justify-content-between mb-6">
                <div>
                    <h1 class="fs-2 fw-bold text-gray-900 mb-1">Pelaksanaan PM</h1>
                    <span class="text-muted fs-6">Rekap dan pantau semua record pelaksanaan preventive maintenance</span>
                </div>
                {{-- ── FIX: Kedua tombol sejajar, bukan override satu sama lain ── --}}
                <div class="d-flex gap-2">
                    <a href="{{ route('admin.records.create') }}" class="btn btn-primary">
                        <i class="bi bi-plus-circle me-2"></i>Buat Record PM
                    </a>
                    {{-- ── FIX QR: Arahkan ke modal scan, bukan route from-qr langsung ── --}}
                    <button type="button" class="btn btn-light-primary" data-bs-toggle="modal" data-bs-target="#qrScanModal">
                        <i class="bi bi-qr-code-scan me-2"></i>Scan QR
                    </button>
                </div>
            </div>

            @if(session('success'))
            <div class="alert alert-success d-flex align-items-center mb-5">
                <i class="bi bi-check-circle me-3 fs-4"></i>
                <div>{{ session('success') }}</div>
            </div>
            @endif

            @if(session('error'))
            <div class="alert alert-danger d-flex align-items-center mb-5">
                <i class="bi bi-x-circle me-3 fs-4"></i>
                <div>{{ session('error') }}</div>
            </div>
            @endif

            {{-- ── STAT CARDS ── --}}
            <div class="row g-4 mb-6">
                @php
                    $statCards = [
                        ['label'=>'Total Record',    'value'=>$stats->total       ?? 0, 'icon'=>'bi-file-earmark-check', 'color'=>'primary'],
                        ['label'=>'In Progress',     'value'=>$stats->in_progress ?? 0, 'icon'=>'bi-hourglass-split',   'color'=>'warning'],
                        ['label'=>'Selesai (Cek)',   'value'=>$stats->completed   ?? 0, 'icon'=>'bi-clipboard-check',   'color'=>'info'],
                        ['label'=>'Validated',       'value'=>$stats->validated   ?? 0, 'icon'=>'bi-patch-check',       'color'=>'success'],
                        ['label'=>'Rejected',        'value'=>$stats->rejected    ?? 0, 'icon'=>'bi-x-circle',          'color'=>'danger'],
                    ];
                @endphp
                @foreach($statCards as $card)
                <div class="col-6 col-lg">
                    <div class="card card-flush h-100 border-0 shadow-sm">
                        <div class="card-body d-flex align-items-center gap-3 p-5">
                            <div class="symbol symbol-50px">
                                <div class="symbol-label bg-light-{{ $card['color'] }}">
                                    <i class="bi {{ $card['icon'] }} fs-2 text-{{ $card['color'] }}"></i>
                                </div>
                            </div>
                            <div>
                                <div class="fs-2 fw-bold text-gray-900">{{ number_format($card['value']) }}</div>
                                <div class="fs-7 text-muted">{{ $card['label'] }}</div>
                            </div>
                        </div>
                    </div>
                </div>
                @endforeach
            </div>

            {{-- ── FILTER + TABEL ── --}}
            <div class="card card-flush border-0 shadow-sm">
                <div class="card-header border-0 pt-6">
                    <div class="card-title flex-wrap gap-2">
                        <form method="GET" class="d-flex gap-2 flex-wrap align-items-center" id="filterForm">
                            <div class="input-group input-group-sm" style="width:220px;">
                                <span class="input-group-text border-0 bg-light">
                                    <i class="bi bi-search text-muted"></i>
                                </span>
                                <input type="text" name="search" class="form-control border-0 bg-light"
                                       placeholder="Cari no record, equipment..." value="{{ $search }}">
                            </div>
                            <select name="filter_status" class="form-select form-select-sm w-auto" onchange="this.form.submit()">
                                <option value="all"        @selected(!$filterStatus || $filterStatus==='all')>Semua Status</option>
                                <option value="in_progress" @selected($filterStatus==='in_progress')>In Progress</option>
                                <option value="completed"   @selected($filterStatus==='completed')>Completed</option>
                                <option value="validated"   @selected($filterStatus==='validated')>Validated</option>
                                <option value="rejected"    @selected($filterStatus==='rejected')>Rejected</option>
                            </select>
                            <select name="filter_cycle" class="form-select form-select-sm w-auto" onchange="this.form.submit()">
                                <option value="all" @selected(!$filterCycle || $filterCycle==='all')>Semua Cycle</option>
                                <option value="6M"  @selected($filterCycle==='6M')>6 Bulan</option>
                                <option value="1Y"  @selected($filterCycle==='1Y')>1 Tahun</option>
                                <option value="2Y"  @selected($filterCycle==='2Y')>2 Tahun</option>
                            </select>
                            <input type="month" name="filter_month" class="form-control form-control-sm w-auto"
                                   value="{{ $filterMonth }}" onchange="this.form.submit()">
                            <button type="submit" class="btn btn-sm btn-primary">
                                <i class="bi bi-search"></i>
                            </button>
                            @if($search || ($filterStatus && $filterStatus !== 'all') || $filterCycle || $filterMonth)
                            <a href="{{ route('admin.records.index') }}" class="btn btn-sm btn-light-danger">
                                <i class="bi bi-x-circle me-1"></i>Reset
                            </a>
                            @endif
                        </form>
                    </div>
                </div>

                <div class="card-body pt-0">
                    @if($records->isEmpty())
                    <div class="text-center py-10">
                        <i class="bi bi-file-earmark-x fs-1 text-muted mb-3 d-block"></i>
                        <p class="text-muted">Tidak ada record yang ditemukan.</p>
                        <a href="{{ route('admin.records.create') }}" class="btn btn-sm btn-primary">
                            <i class="bi bi-plus me-1"></i>Buat Record Pertama
                        </a>
                    </div>
                    @else
                    <div class="table-responsive">
                        <table class="table table-row-dashed table-row-gray-200 align-middle gs-0 gy-3">
                            <thead>
                                <tr class="fw-bold text-muted fs-7 text-uppercase">
                                    <th class="ps-4">No Record</th>
                                    <th>Equipment</th>
                                    <th>Template</th>
                                    <th>Tanggal</th>
                                    <th>Teknisi</th>
                                    <th>Status</th>
                                    <th>Durasi</th>
                                    <th class="text-end pe-4">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($records as $r)
                                @php
                                    $statusMap = [
                                        'in_progress' => ['class'=>'badge-light-warning', 'label'=>'In Progress',     'icon'=>'bi-hourglass-split'],
                                        'completed'   => ['class'=>'badge-light-info',    'label'=>'Menunggu Cek',    'icon'=>'bi-clipboard-check'],
                                        'validated'   => ['class'=>'badge-light-success', 'label'=>'Validated',       'icon'=>'bi-patch-check'],
                                        'rejected'    => ['class'=>'badge-light-danger',  'label'=>'Rejected',        'icon'=>'bi-x-circle'],
                                    ];
                                    $st = $statusMap[$r->status] ?? ['class'=>'badge-light','label'=>$r->status,'icon'=>'bi-circle'];

                                    // ── FIX DURASI ────────────────────────────────────────────────
                                    // Hitung durasi hanya jika start_time DAN end_time keduanya ada
                                    $durationText = null;
                                    if ($r->start_time && $r->end_time) {
                                        $start = \Carbon\Carbon::parse($r->maintenance_date . ' ' . $r->start_time);
                                        $end   = \Carbon\Carbon::parse($r->maintenance_date . ' ' . $r->end_time);
                                        $diffMin = $start->diffInMinutes($end);
                                        if ($diffMin >= 60) {
                                            $h = intdiv($diffMin, 60);
                                            $m = $diffMin % 60;
                                            $durationText = $h . 'j ' . ($m > 0 ? $m . 'mnt' : '');
                                        } else {
                                            $durationText = $diffMin . ' mnt';
                                        }
                                    }
                                @endphp
                                <tr>
                                    <td class="ps-4">
                                        <a href="{{ route('admin.records.show', $r->id) }}"
                                           class="fw-bold text-primary">
                                            {{ $r->record_number }}
                                        </a>
                                    </td>
                                    <td>
                                        <div class="fw-semibold text-gray-800">{{ $r->equipment_name }}</div>
                                        <div class="text-muted fs-8">{{ $r->equipment_code }}</div>
                                    </td>
                                    <td>
                                        <div class="text-gray-700 fs-7">{{ Str::limit($r->template_name, 25) }}</div>
                                        <span class="badge badge-light-primary fs-8">{{ $r->pm_cycle }}</span>
                                    </td>
                                    <td class="text-muted fs-7">
                                        {{ \Carbon\Carbon::parse($r->maintenance_date)->format('d M Y') }}
                                    </td>
                                    <td class="text-muted fs-7">{{ $r->technician_name }}</td>
                                    <td>
                                        <span class="badge {{ $st['class'] }} fw-semibold px-3 py-2">
                                            <i class="bi {{ $st['icon'] }} me-1"></i>{{ $st['label'] }}
                                        </span>
                                        @if($r->checker_name)
                                        <div class="text-muted fs-8 mt-1">Checker: {{ $r->checker_name }}</div>
                                        @endif
                                    </td>

                                    {{-- ── FIX KOLOM DURASI ─────────────────────────────────────── --}}
                                    <td class="fs-7">
                                        @if($durationText)
                                            {{-- Ada durasi: tampilkan dengan badge hijau --}}
                                            <span class="badge badge-light-success fw-semibold">
                                                <i class="bi bi-clock me-1"></i>{{ $durationText }}
                                            </span>
                                        @elseif($r->status === 'in_progress')
                                            {{-- Sedang berjalan: tampilkan badge kuning --}}
                                            <span class="badge badge-light-warning fw-semibold">
                                                <i class="bi bi-hourglass-split me-1"></i>Running...
                                            </span>
                                        @else
                                            {{-- Selesai tapi end_time tidak tercatat --}}
                                            <span class="text-muted">—</span>
                                        @endif
                                    </td>

                                    <td class="text-end pe-4">
                                        <div class="d-flex justify-content-end gap-2">
                                            @if($r->status === 'in_progress')
                                            <a href="{{ route('admin.records.work', $r->id) }}"
                                               class="btn btn-sm btn-warning">
                                                <i class="bi bi-pencil-fill me-1"></i>Kerjakan
                                            </a>
                                            @else
                                            <a href="{{ route('admin.records.show', $r->id) }}"
                                               class="btn btn-sm btn-light-primary">
                                                <i class="bi bi-eye me-1"></i>Detail
                                            </a>
                                            @endif
                                            @if($r->status === 'completed')
                                            <a href="{{ route('admin.records.show', $r->id) }}#validate"
                                               class="btn btn-sm btn-success">
                                                <i class="bi bi-check-circle me-1"></i>Validasi
                                            </a>
                                            @endif
                                        </div>
                                    </td>
                                </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>

                    <div class="d-flex justify-content-between align-items-center mt-4">
                        <div class="text-muted fs-7">
                            Menampilkan {{ $records->firstItem() }}–{{ $records->lastItem() }}
                            dari {{ $records->total() }} record
                        </div>
                        {{ $records->links() }}
                    </div>
                    @endif
                </div>
            </div>

        </div>
    </div>
</div>

{{-- ══════════════════════════════════════════════════════════════════════════
     MODAL SCAN QR
     FIX: Scan QR di browser HP menggunakan html5-qrcode library.
     Setelah QR terdeteksi → redirect ke URL hasil scan (yaitu URL /admin/maintenance/create?equipment_id=X)
══════════════════════════════════════════════════════════════════════════ --}}
<div class="modal fade" id="qrScanModal" tabindex="-1" aria-labelledby="qrScanModalLabel">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header border-0 pb-0">
                <h5 class="modal-title fw-bold" id="qrScanModalLabel">
                    <i class="bi bi-qr-code-scan me-2 text-primary"></i>Scan QR Code Equipment
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                {{-- Instruksi --}}
                <div class="alert alert-light-primary d-flex align-items-center mb-4 py-3">
                    <i class="bi bi-info-circle text-primary fs-5 me-3"></i>
                    <div class="fs-8 text-gray-700">
                        Arahkan kamera ke QR Code yang tertempel pada equipment. Sistem akan otomatis mendeteksi dan membuka form PM.
                    </div>
                </div>

                {{-- Area kamera --}}
                <div id="qr-reader" style="width:100%; border-radius:8px; overflow:hidden;"></div>

                {{-- Status scan --}}
                <div id="qr-status" class="mt-3 text-center" style="display:none;">
                    <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                    <span class="text-muted fs-7">Mendeteksi QR Code...</span>
                </div>

                {{-- Input manual sebagai fallback --}}
                <div class="mt-4 pt-3 border-top border-dashed">
                    <label class="form-label fw-semibold fs-8 text-muted text-uppercase">
                        Atau masukkan Equipment ID secara manual
                    </label>
                    <div class="input-group input-group-sm">
                        <input type="number" id="manual-equipment-id" class="form-control"
                               placeholder="Contoh: 5">
                        <button type="button" class="btn btn-primary" onclick="goToEquipmentPm()">
                            <i class="bi bi-arrow-right"></i> Buka
                        </button>
                    </div>
                </div>
            </div>
            <div class="modal-footer border-0 pt-0">
                <button type="button" class="btn btn-light" data-bs-dismiss="modal"
                        onclick="stopQrScanner()">Tutup</button>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
{{-- html5-qrcode: library scan QR di browser tanpa plugin tambahan --}}
<script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
<script>
let html5QrCode = null;

// ── Mulai scanner saat modal dibuka ──────────────────────────────────────
document.getElementById('qrScanModal').addEventListener('shown.bs.modal', function () {
    startQrScanner();
});

// ── Stop scanner saat modal ditutup ──────────────────────────────────────
document.getElementById('qrScanModal').addEventListener('hidden.bs.modal', function () {
    stopQrScanner();
});

function startQrScanner() {
    html5QrCode = new Html5Qrcode('qr-reader');

    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
    };

    html5QrCode.start(
        { facingMode: 'environment' }, // kamera belakang
        config,
        function (decodedText) {
            // ── QR berhasil dibaca ──────────────────────────────────────
            onQrSuccess(decodedText);
        },
        function (errorMessage) {
            // scanning gagal per frame — abaikan, ini normal
        }
    ).catch(function (err) {
        // Kamera tidak bisa diakses
        document.getElementById('qr-reader').innerHTML = `
            <div class="text-center py-6 text-muted">
                <i class="bi bi-camera-video-off fs-2x d-block mb-2 text-danger"></i>
                <div class="fs-7">Kamera tidak dapat diakses.<br>Gunakan input manual di bawah.</div>
            </div>
        `;
    });
}

function stopQrScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
    }
}

function onQrSuccess(decodedText) {
    // Stop scanner supaya tidak scan berulang
    stopQrScanner();

    // Tampilkan status loading
    document.getElementById('qr-status').style.display = '';

    // Validasi: URL harus mengandung domain kita dan /admin/maintenance/create atau /admin/records/from-qr
    // Format URL QR: http(s)://domain/admin/records/from-qr?equipment_id=X
    // atau format lama: http(s)://domain/admin/maintenance/create?equipment_id=X
    try {
        const url = new URL(decodedText);
        const equipmentId = url.searchParams.get('equipment_id');

        if (equipmentId) {
            // Redirect ke route createFromQr dengan equipment_id
            // FIX: gunakan route yang benar sesuai definisi di web.php
            window.location.href = `{{ route('admin.records.from-qr') }}?equipment_id=${equipmentId}`;
        } else {
            // Mungkin URL lain atau format berbeda — coba redirect langsung
            window.location.href = decodedText;
        }
    } catch (e) {
        // Bukan URL valid — tampilkan error
        document.getElementById('qr-status').innerHTML = `
            <div class="alert alert-danger py-2 fs-8">
                <i class="bi bi-x-circle me-1"></i>
                QR Code tidak valid. Pastikan scan QR equipment yang benar.
            </div>
        `;
        document.getElementById('qr-status').style.display = '';
        // Restart scanner setelah 2 detik
        setTimeout(() => {
            document.getElementById('qr-status').style.display = 'none';
            startQrScanner();
        }, 2500);
    }
}

// ── Input manual ──────────────────────────────────────────────────────────
function goToEquipmentPm() {
    const id = document.getElementById('manual-equipment-id').value.trim();
    if (!id || isNaN(id)) {
        document.getElementById('manual-equipment-id').classList.add('is-invalid');
        return;
    }
    window.location.href = `{{ route('admin.records.from-qr') }}?equipment_id=${id}`;
}

document.getElementById('manual-equipment-id').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') goToEquipmentPm();
    this.classList.remove('is-invalid');
});
</script>
@endpush