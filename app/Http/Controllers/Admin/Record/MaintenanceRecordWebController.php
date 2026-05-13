<?php

namespace App\Http\Controllers\Admin\Record;

use App\Exports\MaintenanceRecordExport;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class MaintenanceRecordWebController extends Controller
{
    // ============================================================
    // INDEX — Daftar semua maintenance record
    // ============================================================
    public function index(Request $request)
    {
        $search        = $request->input('search');
        $filterStatus  = $request->input('filter_status');
        $filterCycle   = $request->input('filter_cycle');
        $filterMonth   = $request->input('filter_month');
        $perPage       = $request->input('per_page', 25);

        $query = DB::table('maintenance_records as mr')
            ->join('equipment as e', 'mr.equipment_id', '=', 'e.id')
            ->join('users as tech', 'mr.technician_id', '=', 'tech.id')
            ->leftJoin('users as checker', 'mr.checker_id', '=', 'checker.id')
            ->leftJoin('users as validator', 'mr.validator_id', '=', 'validator.id')
            ->leftJoin('check_sheet_templates as cst', 'mr.template_id', '=', 'cst.id')
            ->select(
                'mr.id',
                'mr.record_number',
                'mr.maintenance_date',
                'mr.start_time',
                'mr.end_time',
                'mr.status',
                'mr.notes',
                'cst.pm_cycle',
                'cst.template_name',
                'e.equipment_code',
                'e.equipment_name',
                'e.etm_group',
                'tech.name as technician_name',
                'checker.name as checker_name',
                'validator.name as validator_name',
            );

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('mr.record_number', 'LIKE', "%{$search}%")
                    ->orWhere('e.equipment_name', 'LIKE', "%{$search}%")
                    ->orWhere('e.equipment_code', 'LIKE', "%{$search}%")
                    ->orWhere('tech.name', 'LIKE', "%{$search}%");
            });
        }

        if ($filterStatus && $filterStatus !== 'all') {
            $query->where('mr.status', $filterStatus);
        }

        if ($filterCycle && $filterCycle !== 'all') {
            $query->where('cst.pm_cycle', $filterCycle);
        }

        if ($filterMonth) {
            [$y, $m] = explode('-', $filterMonth);
            $query->whereYear('mr.maintenance_date', $y)
                ->whereMonth('mr.maintenance_date', $m);
        }

        $query->orderByRaw("CASE mr.status
                WHEN 'in_progress' THEN 1
                WHEN 'completed'   THEN 2
                WHEN 'validated'   THEN 3
                WHEN 'rejected'    THEN 4
                ELSE 5 END")
            ->orderBy('mr.maintenance_date', 'desc');

        $records = $query->paginate($perPage)->appends([
            'search'        => $search,
            'filter_status' => $filterStatus,
            'filter_cycle'  => $filterCycle,
            'filter_month'  => $filterMonth,
            'per_page'      => $perPage,
        ]);

        // ── Stat cards ──
        $stats = DB::table('maintenance_records')
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'completed'   THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'validated'   THEN 1 ELSE 0 END) as validated,
                SUM(CASE WHEN status = 'rejected'    THEN 1 ELSE 0 END) as rejected
            ")
            ->first();

        return view('admin.maintenance.index', compact(
            'records',
            'search',
            'filterStatus',
            'filterCycle',
            'filterMonth',
            'stats',
        ));
    }

    // ============================================================
    // CREATE — Form buat record baru dari jadwal
    // ============================================================
    public function create(Request $request)
    {
        $scheduleId = $request->input('schedule_id');

        // Ambil data schedule yang dipilih
        $schedule = null;
        $equipment = null;
        $templates = collect();

        if ($scheduleId) {
            $schedule = DB::table('maintenance_schedules as ms')
                ->join('equipment as e', 'ms.equipment_id', '=', 'e.id')
                ->select('ms.*', 'e.equipment_code', 'e.equipment_name', 'e.etm_group', 'e.location')
                ->where('ms.id', $scheduleId)
                ->first();

            if ($schedule) {
                $templates = DB::table('check_sheet_templates')
                    ->where('equipment_id', $schedule->equipment_id)
                    ->where('pm_cycle', $schedule->pm_cycle)
                    ->where('is_active', 1)
                    ->get();
            }
        }

        // List equipment untuk dropdown
        $equipmentList = DB::table('equipment')
            ->where('status', 'active')
            ->orderBy('equipment_name')
            ->get(['id', 'equipment_code', 'equipment_name', 'etm_group']);

        // List schedule yang due/overdue (untuk dropdown pilih jadwal)
        $dueSchedules = DB::table('maintenance_schedules as ms')
            ->join('equipment as e', 'ms.equipment_id', '=', 'e.id')
            ->select(
                'ms.id',
                'ms.pm_cycle',
                'ms.next_maintenance',
                'ms.status',
                'e.equipment_code',
                'e.equipment_name'
            )
            ->whereIn('ms.status', ['due', 'overdue'])
            ->orderByRaw("CASE ms.status WHEN 'overdue' THEN 1 WHEN 'due' THEN 2 ELSE 3 END")
            ->orderBy('ms.next_maintenance')
            ->get();

        return view('admin.maintenance.create', compact(
            'schedule',
            'scheduleId',
            'templates',
            'equipmentList',
            'dueSchedules',
        ));
    }

    public function createFromQr(Request $request)
    {
        // ── Validasi: equipment_id wajib ada di query string ─────────────
        $equipmentId = $request->input('equipment_id');

        if (!$equipmentId || !is_numeric($equipmentId)) {
            return redirect()->route('admin.records.index')
                ->with('error', 'QR Code tidak valid: equipment_id tidak ditemukan. Pastikan scan QR yang benar.');
        }

        // ── Ambil data equipment ─────────────────────────────────────────
        $equipment = DB::table('equipment')
            ->where('id', (int) $equipmentId)
            ->first();

        // ── FIX: Pesan error lebih informatif ────────────────────────────
        if (!$equipment) {
            return redirect()->route('admin.records.index')
                ->with('error', "Equipment dengan ID {$equipmentId} tidak ditemukan. Hubungi admin.");
        }

        if ($equipment->status === 'inactive') {
            return redirect()->route('admin.records.index')
                ->with('error', "Equipment [{$equipment->equipment_code}] {$equipment->equipment_name} sedang tidak aktif.");
        }

        // ── Ambil jadwal due/overdue untuk equipment ini ─────────────────
        // LEFT JOIN ke template supaya tidak gagal jika template belum dibuat
        $schedules = DB::table('maintenance_schedules as ms')
            ->leftJoin('check_sheet_templates as ct', function ($join) {
                $join->on('ct.equipment_id', '=', 'ms.equipment_id')
                    ->whereColumn('ct.pm_cycle', 'ms.pm_cycle')
                    ->where('ct.is_active', 1);
            })
            ->select(
                'ms.id',
                'ms.pm_cycle',
                'ms.next_maintenance',
                'ms.last_maintenance',
                'ms.status',
                'ct.id   as template_id',
                'ct.template_name',
            )
            ->where('ms.equipment_id', (int) $equipmentId)
            ->whereIn('ms.status', ['due', 'overdue'])
            ->orderByRaw("CASE ms.status WHEN 'overdue' THEN 1 WHEN 'due' THEN 2 END")
            ->orderBy('ms.next_maintenance', 'asc')
            ->get();

        // ── Render landing page QR ───────────────────────────────────────
        return view('admin.maintenance.qr_landing', compact('equipment', 'schedules'));
    }

    // ============================================================
    // STORE — Simpan record baru
    // ============================================================
    public function store(Request $request)
    {
        $request->validate([
            'schedule_id' => 'required|exists:maintenance_schedules,id',
            'template_id' => 'required|exists:check_sheet_templates,id',
            'maintenance_date' => 'required|date',
            'start_time' => 'required',
            'notes' => 'nullable|string|max:1000',
        ]);

        $schedule = DB::table('maintenance_schedules')->where('id', $request->schedule_id)->first();
        $template = DB::table('check_sheet_templates')->where('id', $request->template_id)->first();

        // Generate record number: PM-YYYYMMDD-XXXX
        $dateStr = now()->format('Ymd');
        $count   = DB::table('maintenance_records')
            ->whereDate('created_at', now()->toDateString())
            ->count() + 1;
        $recordNumber = 'PM-' . $dateStr . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

        DB::beginTransaction();
        try {
            // Buat maintenance record
            $recordId = DB::table('maintenance_records')->insertGetId([
                'record_number'    => $recordNumber,
                'equipment_id'     => $schedule->equipment_id,
                'schedule_id'      => $request->schedule_id,
                'template_id'      => $request->template_id,
                'technician_id'    => Auth::id(),
                'maintenance_date' => $request->maintenance_date,
                'start_time'       => $request->start_time,
                'status'           => 'in_progress',
                'notes'            => $request->notes,
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);

            // Buat record items dari check_sheet_items template
            $checkItems = DB::table('check_sheet_items')
                ->where('template_id', $request->template_id)
                ->where('is_active', 1)
                ->orderBy('item_number')
                ->get();

            $itemsToInsert = [];
            foreach ($checkItems as $item) {
                $itemsToInsert[] = [
                    'maintenance_record_id' => $recordId,
                    'check_item_id'         => $item->id,
                    'status'                => 'pending',
                    'created_at'            => now(),
                    'updated_at'            => now(),
                ];
            }

            if (!empty($itemsToInsert)) {
                DB::table('maintenance_record_items')->insert($itemsToInsert);
            }

            // Update status schedule → in progress (tetap due/overdue sampai completed)
            DB::commit();

            return redirect()->route('admin.records.work', $recordId)
                ->with('success', "Record {$recordNumber} berhasil dibuat. Silakan isi check sheet.");
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Gagal membuat record: ' . $e->getMessage())->withInput();
        }
    }

    // ============================================================
    // SHOW — Detail record (readonly, untuk checker/validator)
    // ============================================================
    public function show($id)
    {
        $record = $this->getRecordDetail($id);

        if (!$record) {
            return redirect()->route('admin.maintenance.index')
                ->with('error', 'Record tidak ditemukan.');
        }

        // Ambil semua item beserta detail check_sheet_items
        $items = DB::table('maintenance_record_items as mri')
            ->join('check_sheet_items as csi', 'mri.check_item_id', '=', 'csi.id')
            ->select(
                'mri.id',
                'mri.status',
                'mri.remarks',
                'mri.measurements',
                'mri.photos',
                'mri.requires_action',
                'mri.action_required',
                'csi.item_number',
                'csi.sub_equipment',
                'csi.check_item',
                'csi.maintenance_standard',
                'csi.pm_types',
                'csi.man_power',
                'csi.time_minutes',
            )
            ->where('mri.maintenance_record_id', $id)
            ->orderBy('csi.item_number')
            ->get()
            ->map(function ($item) {
                $item->measurements = $item->measurements ? json_decode($item->measurements, true) : null;
                $item->photos       = $item->photos ? json_decode($item->photos, true) : [];
                $item->pm_types     = $item->pm_types ? json_decode($item->pm_types, true) : [];
                return $item;
            });

        // Progress summary
        $progress = $this->calculateProgress($items);

        return view('admin.maintenance.show', compact('record', 'items', 'progress'));
    }

    // ============================================================
    // WORK — Halaman pengerjaan check sheet (teknisi)
    // ============================================================
    public function work($id)
    {
        $record = $this->getRecordDetail($id);

        if (!$record) {
            return redirect()->route('admin.maintenance.index')
                ->with('error', 'Record tidak ditemukan.');
        }

        // Hanya boleh edit jika in_progress
        if (!in_array($record->status, ['in_progress', 'rejected'])) {
            return redirect()->route('admin.records.show', $id)
                ->with('info', 'Record ini sudah tidak dapat diedit.');
        }

        // Ambil semua item
        $items = DB::table('maintenance_record_items as mri')
            ->join('check_sheet_items as csi', 'mri.check_item_id', '=', 'csi.id')
            ->select(
                'mri.id',
                'mri.check_item_id',
                'mri.status',
                'mri.remarks',
                'mri.measurements',
                'mri.photos',
                'mri.requires_action',
                'mri.action_required',
                'csi.item_number',
                'csi.sub_equipment',
                'csi.check_item',
                'csi.maintenance_standard',
                'csi.pm_types',
                'csi.man_power',
                'csi.time_minutes',
            )
            ->where('mri.maintenance_record_id', $id)
            ->orderBy('csi.item_number')
            ->get()
            ->map(function ($item) {
                $item->measurements = $item->measurements ? json_decode($item->measurements, true) : null;
                $item->photos       = $item->photos ? json_decode($item->photos, true) : [];
                $item->pm_types     = $item->pm_types ? json_decode($item->pm_types, true) : [];
                return $item;
            });

        // Group items by sub_equipment
        $groupedItems = $items->groupBy('sub_equipment');
        $progress     = $this->calculateProgress($items);

        return view('admin.maintenance.work', compact(
            'record',
            'items',
            'groupedItems',
            'progress',
        ));
    }

    // ============================================================
    // UPDATE ITEM — Simpan hasil 1 item check sheet (AJAX)
    // ============================================================
    public function updateItem(Request $request, $recordId, $itemId)
    {
        $request->validate([
            'status'          => 'required|in:ok,ng,na,pending',
            'remarks'         => 'nullable|string|max:500',
            'measurements'    => 'nullable|array',
            'requires_action' => 'nullable|boolean',
            'action_required' => 'nullable|string|max:500',
            'actual_man_power'     => 'nullable|integer|min:1|max:99',
            'actual_time_minutes'  => 'nullable|integer|min:1|max:9999',
        ]);

        // Pastikan item milik record ini
        $item = DB::table('maintenance_record_items')
            ->where('id', $itemId)
            ->where('maintenance_record_id', $recordId)
            ->first();

        if (!$item) {
            return response()->json(['success' => false, 'message' => 'Item tidak ditemukan.'], 404);
        }

        DB::table('maintenance_record_items')
            ->where('id', $itemId)
            ->update([
                'status'          => $request->status,
                'remarks'         => $request->remarks,
                'measurements'    => $request->measurements ? json_encode($request->measurements) : null,
                'requires_action' => $request->boolean('requires_action'),
                'action_required' => $request->action_required,
                'actual_man_power'    => $request->actual_man_power,
                'actual_time_minutes' => $request->actual_time_minutes,
                'updated_at'      => now(),
            ]);

        // Hitung ulang progress
        // $items    = DB::table('maintenance_record_items')->where('maintenance_record_id', $recordId)->get();
        // $progress = $this->calculateProgressRaw($items);

        // Hitung ulang progress
        $items    = DB::table('maintenance_record_items')
            ->where('maintenance_record_id', $recordId)
            ->get();
        $total    = $items->count();
        $done     = $items->whereIn('status', ['ok', 'ng', 'na'])->count();
        $percent  = $total > 0 ? round(($done / $total) * 100) : 0;

        return response()->json([
            'success'  => true,
            'message'  => 'Item berhasil disimpan.',
            // 'progress' => $progress,
            'progress' => compact('total', 'done', 'percent'),
        ]);
    }

    // ============================================================
    // UPLOAD PHOTO — Upload foto untuk item tertentu (AJAX)
    // ============================================================
    public function uploadPhoto(Request $request, $recordId, $itemId = null)
    {
        $request->validate([
            'photo'   => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
            'item_id' => 'nullable|exists:maintenance_record_items,id',
        ]);

        $targetItemId = $itemId ?? $request->input('item_id');

        if (!$targetItemId) {
            return response()->json(['success' => false, 'message' => 'Item ID diperlukan.'], 422);
        }

        $item = DB::table('maintenance_record_items')
            ->where('id', $targetItemId)
            ->where('maintenance_record_id', $recordId)
            ->first();

        if (!$item) {
            return response()->json(['success' => false, 'message' => 'Item tidak ditemukan.'], 404);
        }

        // Simpan file
        $path    = $request->file('photo')->store("maintenance/{$recordId}", 'public');
        $photos  = $item->photos ? json_decode($item->photos, true) : [];
        $photos[] = [
            'path'       => $path,
            'url'        => Storage::url($path),
            'uploaded_at' => now()->toDateTimeString(),
        ];

        DB::table('maintenance_record_items')
            ->where('id', $targetItemId)
            ->update([
                'photos'     => json_encode($photos),
                'updated_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'photo'   => [
                'path' => $path,
                'url'  => Storage::url($path),
            ],
        ]);
    }

    // ============================================================
    // COMPLETE — Teknisi submit record (selesai dikerjakan)
    // ============================================================
    public function complete(Request $request, $id)
    {
        $record = DB::table('maintenance_records')->where('id', $id)->first();

        if (!$record || $record->status !== 'in_progress') {
            return back()->with('error', 'Record tidak dapat diselesaikan.');
        }

        // Pastikan semua item sudah diisi (tidak ada yg pending)
        $pendingCount = DB::table('maintenance_record_items')
            ->where('maintenance_record_id', $id)
            ->where('status', 'pending')
            ->count();

        if ($pendingCount > 0) {
            return back()->with('error', "Masih ada {$pendingCount} item yang belum diisi.");
        }

        DB::table('maintenance_records')->where('id', $id)->update([
            'status'     => 'completed',
            'end_time'   => now()->format('H:i:s'),
            'updated_at' => now(),
        ]);

        return redirect()->route('admin.records.show', $id)
            ->with('success', 'Record berhasil diselesaikan dan menunggu validasi checker.');
    }

    // ============================================================
    // VALIDATE — Checker/Validator setujui atau tolak record
    // ============================================================
    public function validasi(Request $request, $id)
    {
        $request->validate([
            'action' => 'required|in:validate,reject',
            'notes'  => 'nullable|string|max:500',
        ]);

        $record = DB::table('maintenance_records')->where('id', $id)->first();

        if (!$record || !in_array($record->status, ['completed', 'validated'])) {
            return back()->with('error', 'Record tidak dapat divalidasi.');
        }

        $newStatus = $request->action === 'validate' ? 'validated' : 'rejected';
        $field     = $record->status === 'completed' ? 'checker_id' : 'validator_id';

        DB::table('maintenance_records')->where('id', $id)->update([
            'status'     => $newStatus,
            $field       => Auth::id(),
            'notes'      => $request->notes ?? $record->notes,
            'updated_at' => now(),
        ]);

        // Jika validated, update schedule status → completed + last_maintenance
        if ($newStatus === 'validated') {
            DB::table('maintenance_schedules')
                ->where('id', $record->schedule_id)
                ->update([
                    'status'           => 'completed',
                    'last_maintenance' => $record->maintenance_date,
                    'updated_at'       => now(),
                ]);
        }

        $msg = $newStatus === 'validated'
            ? 'Record berhasil divalidasi.'
            : 'Record dikembalikan untuk diperbaiki.';

        return redirect()->route('admin.records.show', $id)->with('success', $msg);
    }

    // ============================================================
    // PRIVATE HELPERS
    // ============================================================
    private function getRecordDetail($id)
    {
        return DB::table('maintenance_records as mr')
            ->join('equipment as e', 'mr.equipment_id', '=', 'e.id')
            ->join('maintenance_schedules as ms', 'mr.schedule_id', '=', 'ms.id')
            ->join('check_sheet_templates as cst', 'mr.template_id', '=', 'cst.id')
            ->join('users as tech', 'mr.technician_id', '=', 'tech.id')
            ->leftJoin('users as checker', 'mr.checker_id', '=', 'checker.id')
            ->leftJoin('users as validator', 'mr.validator_id', '=', 'validator.id')
            ->select(
                'mr.id',
                'mr.record_number',
                'mr.maintenance_date',
                'mr.start_time',
                'mr.end_time',
                'mr.status',
                'mr.notes',
                'mr.attachments',
                'cst.pm_cycle',
                'cst.template_name',
                'cst.doc_number',
                'e.id as equipment_id',
                'e.equipment_code',
                'e.equipment_name',
                'e.etm_group',
                'e.location',
                'ms.id as schedule_id',
                'ms.next_maintenance',
                'tech.name as technician_name',
                'tech.email as technician_email',
                'checker.name as checker_name',
                'validator.name as validator_name',
            )
            ->where('mr.id', $id)
            ->first();
    }

    private function calculateProgress($items)
    {
        $total     = $items->count();
        $done      = $items->whereIn('status', ['ok', 'ng', 'na'])->count();
        $ok        = $items->where('status', 'ok')->count();
        $ng        = $items->where('status', 'ng')->count();
        $pending   = $items->where('status', 'pending')->count();
        $percent   = $total > 0 ? round(($done / $total) * 100) : 0;

        return compact('total', 'done', 'ok', 'ng', 'pending', 'percent');
    }

    private function calculateProgressRaw($items)
    {
        $total   = $items->count();
        $done    = $items->whereIn('status', ['ok', 'ng', 'na'])->count();
        $percent = $total > 0 ? round(($done / $total) * 100) : 0;

        return compact('total', 'done', 'percent');
    }

    public function export(Request $request, $id)
    {
        $record = DB::table('maintenance_records')->where('id', $id)->first();

        if (!$record) {
            return back()->with('error', 'Record tidak ditemukan.');
        }

        // Hanya record yang sudah selesai bisa di-export
        if (!in_array($record->status, ['completed', 'validated'])) {
            return back()->with('error', 'Export hanya tersedia untuk record dengan status Completed atau Validated.');
        }

        return (new MaintenanceRecordExport($id))->download();
    }
}
