<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CheckSheetItems;
use App\Models\CheckSheetTemplates;
use App\Models\Equipment;
use App\Models\MaintenanceRecordItems;
use App\Models\MaintenanceRecords;
use App\Models\MaintenanceSchedules;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class MaintenanceRecordController extends Controller
{
    // Kolom PM Type standar — dipakai FE untuk render checklist dual-layer (plan vs done)
    protected const PM_COLUMNS = ['Check', 'Lubricate', 'Cleaning', 'Tighten', 'Measure', 'Replace'];

    // ============================================================
    // INDEX — daftar semua maintenance record + filter + stats
    // ============================================================
    public function index(Request $request)
    {
        $query = MaintenanceRecords::with(['equipment', 'template', 'technician', 'checker', 'validator']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('record_number', 'LIKE', "%{$search}%")
                    ->orWhereHas('equipment', function ($eq) use ($search) {
                        $eq->where('equipment_name', 'LIKE', "%{$search}%")
                           ->orWhere('equipment_code', 'LIKE', "%{$search}%");
                    })
                    ->orWhereHas('technician', function ($t) use ($search) {
                        $t->where('name', 'LIKE', "%{$search}%");
                    });
            });
        }

        if ($request->filled('filter_status') && $request->filter_status !== 'all') {
            $query->where('status', $request->filter_status);
        }

        if ($request->filled('filter_cycle') && $request->filter_cycle !== 'all') {
            $query->whereHas('template', fn ($t) => $t->where('pm_cycle', $request->filter_cycle));
        }

        if ($request->filled('filter_month')) {
            $parts = explode('-', $request->filter_month);
            if (count($parts) >= 2 && is_numeric($parts[0]) && is_numeric($parts[1])) {
                [$y, $m] = $parts;
                $query->whereYear('maintenance_date', $y)->whereMonth('maintenance_date', $m);
            }
        }

        $query->orderByRaw("CASE status
                WHEN 'in_progress' THEN 1
                WHEN 'completed'   THEN 2
                WHEN 'validated'   THEN 3
                WHEN 'rejected'    THEN 4
                ELSE 5 END")
              ->orderBy('maintenance_date', 'desc');

        $records = $query->paginate($request->input('per_page', 25))
            ->appends($request->only(['search', 'filter_status', 'filter_cycle', 'filter_month', 'per_page']));

        $records->getCollection()->transform(fn ($r) => [
            'id' => $r->id,
            'record_number' => $r->record_number,
            'maintenance_date' => $r->maintenance_date,
            'start_time' => optional($r->start_time)->format('H:i'),
            'end_time' => optional($r->end_time)->format('H:i'),
            'status' => $r->status,
            'notes' => $r->notes,
            'pm_cycle' => $r->template->pm_cycle ?? null,
            'template_name' => $r->template->template_name ?? null,
            'equipment_code' => $r->equipment->equipment_code ?? null,
            'equipment_name' => $r->equipment->equipment_name ?? null,
            'etm_group' => $r->equipment->etm_group ?? null,
            'technician_name' => $r->technician->name ?? null,
            'checker_name' => $r->checker->name ?? null,
            'validator_name' => $r->validator->name ?? null,
            'completion_percentage' => $r->completion_percentage,
        ]);

        $stats = DB::table('maintenance_records')
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'completed'   THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'validated'   THEN 1 ELSE 0 END) as validated,
                SUM(CASE WHEN status = 'rejected'    THEN 1 ELSE 0 END) as rejected
            ")
            ->first();

        return response()->json(['records' => $records, 'stats' => $stats]);
    }

    // ============================================================
    // CREATE-DATA — equipment aktif + jadwal due/overdue (dropdown form Create)
    // ============================================================
    public function createData()
    {
        $equipmentList = Equipment::where('status', 'active')
            ->orderBy('equipment_name')
            ->get(['id', 'equipment_code', 'equipment_name', 'etm_group']);

        $dueSchedules = MaintenanceSchedules::with('equipment')
            ->whereIn('status', ['due', 'overdue'])
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'pm_cycle' => $s->pm_cycle,
                'next_maintenance' => $s->next_maintenance,
                'status' => $s->status,
                'equipment_id' => $s->equipment_id,
                'equipment_code' => $s->equipment->equipment_code ?? null,
                'equipment_name' => $s->equipment->equipment_name ?? null,
            ])
            ->sortBy(fn ($s) => $s['status'] === 'overdue' ? 0 : 1)
            ->values();

        return response()->json([
            'equipment_list' => $equipmentList,
            'due_schedules' => $dueSchedules,
        ]);
    }

    // ============================================================
    // TEMPLATES UNTUK 1 SCHEDULE — dengan fallback ke default_for_etm_group
    // ============================================================
    public function templatesForSchedule($scheduleId)
    {
        $schedule = MaintenanceSchedules::with('equipment')->find($scheduleId);
        if (!$schedule) {
            return response()->json(['message' => 'Jadwal tidak ditemukan.'], 404);
        }

        $etmGroup = $schedule->equipment->etm_group ?? null;

        $templates = CheckSheetTemplates::where('pm_cycle', $schedule->pm_cycle)
            ->where('is_active', 1)
            ->where(function ($q) use ($schedule, $etmGroup) {
                $q->where('equipment_id', $schedule->equipment_id);
                if ($etmGroup) {
                    $q->orWhere(function ($q2) use ($etmGroup) {
                        $q2->whereNull('equipment_id')->where('default_for_etm_group', $etmGroup);
                    });
                }
            })
            ->withCount(['checkSheetItems as active_items_count' => fn ($q) => $q->where('is_active', 1)])
            ->orderByRaw('equipment_id IS NULL') // template spesifik equipment diutamakan
            ->get(['id', 'template_name', 'doc_number', 'pm_cycle', 'equipment_id']);

        return response()->json([
            'schedule' => [
                'id' => $schedule->id,
                'pm_cycle' => $schedule->pm_cycle,
                'equipment_id' => $schedule->equipment_id,
                'equipment_code' => $schedule->equipment->equipment_code ?? null,
                'equipment_name' => $schedule->equipment->equipment_name ?? null,
                'etm_group' => $etmGroup,
                'location' => $schedule->equipment->location ?? null,
            ],
            'templates' => $templates,
        ]);
    }

    // ============================================================
    // STORE — buat record baru + copy check_sheet_items jadi record_items
    // Retry-safe untuk race condition record_number (pola sama seperti
    // fix no_bayar di modul lain).
    // ============================================================
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'schedule_id' => 'required|exists:maintenance_schedules,id',
            'template_id' => 'required|exists:check_sheet_templates,id',
            'maintenance_date' => 'required|date',
            'start_time' => 'required',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Data tidak valid.', 'errors' => $validator->errors()], 422);
        }

        $schedule = MaintenanceSchedules::find($request->schedule_id);
        $checkItems = CheckSheetItems::where('template_id', $request->template_id)
            ->where('is_active', 1)
            ->orderBy('item_number')
            ->get();

        if ($checkItems->isEmpty()) {
            return response()->json(['message' => 'Template ini belum memiliki item check sheet.'], 422);
        }

        $record = null;
        $attempts = 0;

        while (!$record && $attempts < 5) {
            $attempts++;
            try {
                $record = DB::transaction(function () use ($request, $schedule, $checkItems) {
                    $rec = MaintenanceRecords::create([
                        'equipment_id' => $schedule->equipment_id,
                        'schedule_id' => $request->schedule_id,
                        'template_id' => $request->template_id,
                        'technician_id' => Auth::id(),
                        'maintenance_date' => $request->maintenance_date,
                        'start_time' => $request->start_time,
                        'status' => 'in_progress',
                        'notes' => $request->notes,
                    ]);

                    $itemsToInsert = $checkItems->map(fn ($item) => [
                        'maintenance_record_id' => $rec->id,
                        'check_item_id' => $item->id,
                        'status' => 'pending',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ])->toArray();

                    MaintenanceRecordItems::insert($itemsToInsert);

                    return $rec;
                });
            } catch (QueryException $e) {
                // Kode 23000 = duplicate entry (unique constraint record_number) -- retry
                if ($e->getCode() == 23000 && $attempts < 5) {
                    $record = null;
                    continue;
                }
                throw $e;
            }
        }

        if (!$record) {
            return response()->json(['message' => 'Gagal membuat record setelah beberapa percobaan, coba lagi.'], 500);
        }

        return response()->json([
            'message' => "Record {$record->record_number} berhasil dibuat.",
            'data' => ['id' => $record->id, 'record_number' => $record->record_number],
        ], 201);
    }

    // ============================================================
    // SHOW — detail readonly (untuk checker/validator/riwayat)
    // ============================================================
    public function show($id)
    {
        $record = $this->loadRecordDetail($id);
        if (!$record) {
            return response()->json(['message' => 'Record tidak ditemukan.'], 404);
        }

        $items = $this->loadItems($id);

        return response()->json([
            'record' => $record,
            'items' => $items,
            'progress' => $this->calculateProgress($items),
        ]);
    }

    // ============================================================
    // WORK — data untuk halaman pengerjaan checklist (teknisi)
    // Frontend yang menentukan editable/readonly berdasar record.status
    // ============================================================
    public function work($id)
    {
        $record = $this->loadRecordDetail($id);
        if (!$record) {
            return response()->json(['message' => 'Record tidak ditemukan.'], 404);
        }

        $items = $this->loadItems($id);

        $response = [
            'record' => $record,
            'items' => $items,
            'progress' => $this->calculateProgress($items),
            'pm_columns' => self::PM_COLUMNS,
            'editable' => in_array($record['status'], ['in_progress', 'rejected']),
        ];

        return response()->json($response);
    }

    // ============================================================
    // UPDATE ITEM — simpan hasil 1 item check sheet (auto-save per field)
    // ============================================================
    public function updateItem(Request $request, $recordId, $itemId)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:ok,ng,na,pending',
            'remarks' => 'nullable|string|max:500',
            'measurements' => 'nullable|array',
            'completed_pm_types' => 'nullable|array',
            'requires_action' => 'nullable|boolean',
            'action_required' => 'nullable|string|max:500',
            'actual_man_power' => 'nullable|integer|min:1|max:99',
            'actual_time_minutes' => 'nullable|integer|min:1|max:9999',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $item = MaintenanceRecordItems::where('id', $itemId)
            ->where('maintenance_record_id', $recordId)
            ->first();

        if (!$item) {
            return response()->json(['success' => false, 'message' => 'Item tidak ditemukan.'], 404);
        }

        // FIX bug lama: completed_pm_types digabung ke dalam kolom
        // measurements (key 'pm_types_done'), konsisten dengan pola
        // penyimpanan PM type checkbox di project lain -- supaya tidak
        // perlu migration kolom baru dan tidak hilang seperti sebelumnya.
        $measurements = $request->measurements ?? [];
        $measurements['pm_types_done'] = $request->completed_pm_types ?? [];

        $item->update([
            'status' => $request->status,
            'remarks' => $request->remarks,
            'measurements' => $measurements,
            'requires_action' => $request->boolean('requires_action'),
            'action_required' => $request->action_required,
            'actual_man_power' => $request->actual_man_power,
            'actual_time_minutes' => $request->actual_time_minutes,
        ]);

        $items = MaintenanceRecordItems::where('maintenance_record_id', $recordId)->get();
        $total = $items->count();
        $done = $items->whereIn('status', ['ok', 'ng', 'na'])->count();
        $percent = $total > 0 ? round(($done / $total) * 100) : 0;

        return response()->json([
            'success' => true,
            'message' => 'Item berhasil disimpan.',
            'progress' => compact('total', 'done', 'percent'),
        ]);
    }

    // ============================================================
    // UPLOAD PHOTO — foto per item check sheet
    // ============================================================
    public function uploadPhoto(Request $request, $recordId, $itemId)
    {
        $validator = Validator::make($request->all(), [
            'photo' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => $validator->errors()->first()], 422);
        }

        $item = MaintenanceRecordItems::where('id', $itemId)
            ->where('maintenance_record_id', $recordId)
            ->first();

        if (!$item) {
            return response()->json(['success' => false, 'message' => 'Item tidak ditemukan.'], 404);
        }

        $path = $request->file('photo')->store("maintenance/{$recordId}", 'public');
        $photos = $item->photos ?? [];
        $photos[] = [
            'path' => $path,
            'url' => Storage::url($path),
            'uploaded_at' => now()->toDateTimeString(),
        ];

        $item->update(['photos' => $photos]);

        return response()->json([
            'success' => true,
            'photo' => ['path' => $path, 'url' => Storage::url($path)],
        ]);
    }

    // ============================================================
    // COMPLETE — teknisi submit record (semua item wajib sudah diisi)
    // ============================================================
    public function complete($id)
    {
        $record = MaintenanceRecords::find($id);
        if (!$record || $record->status !== 'in_progress') {
            return response()->json(['message' => 'Record tidak dapat diselesaikan.'], 422);
        }

        $pendingCount = MaintenanceRecordItems::where('maintenance_record_id', $id)
            ->where('status', 'pending')
            ->count();

        if ($pendingCount > 0) {
            return response()->json(['message' => "Masih ada {$pendingCount} item yang belum diisi."], 422);
        }

        $record->update([
            'status' => 'completed',
            'end_time' => now()->format('H:i:s'),
        ]);

        return response()->json(['message' => 'Record berhasil diselesaikan dan menunggu validasi checker.']);
    }

    // ============================================================
    // VALIDATE / REJECT — checker (completed→validated) atau
    // validator TL (kalau ada tahap ke-2)
    // ============================================================
    public function validasi(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'action' => 'required|in:validate,reject',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Data tidak valid.', 'errors' => $validator->errors()], 422);
        }

        $record = MaintenanceRecords::find($id);
        if (!$record || !in_array($record->status, ['completed', 'validated'])) {
            return response()->json(['message' => 'Record tidak dapat divalidasi.'], 422);
        }

        $newStatus = $request->action === 'validate' ? 'validated' : 'rejected';
        $field = $record->status === 'completed' ? 'checker_id' : 'validator_id';

        $record->update([
            'status' => $newStatus,
            $field => Auth::id(),
            'notes' => $request->notes ?? $record->notes,
        ]);

        if ($newStatus === 'validated') {
            MaintenanceSchedules::where('id', $record->schedule_id)->update([
                'status' => 'completed',
                'last_maintenance' => $record->maintenance_date,
            ]);
        }

        $msg = $newStatus === 'validated'
            ? 'Record berhasil divalidasi.'
            : 'Record dikembalikan untuk diperbaiki.';

        return response()->json(['message' => $msg, 'status' => $newStatus]);
    }

    // ============================================================
    // PRIVATE HELPERS
    // ============================================================
    private function loadRecordDetail($id)
    {
        $r = MaintenanceRecords::with(['equipment', 'schedule', 'template', 'technician', 'checker', 'validator'])->find($id);
        if (!$r) return null;

        return [
            'id' => $r->id,
            'record_number' => $r->record_number,
            'maintenance_date' => $r->maintenance_date,
            'start_time' => optional($r->start_time)->format('H:i'),
            'end_time' => optional($r->end_time)->format('H:i'),
            'status' => $r->status,
            'notes' => $r->notes,
            'attachments' => $r->attachments,
            'pm_cycle' => $r->template->pm_cycle ?? null,
            'template_name' => $r->template->template_name ?? null,
            'doc_number' => $r->template->doc_number ?? null,
            'equipment_id' => $r->equipment->id ?? null,
            'equipment_code' => $r->equipment->equipment_code ?? null,
            'equipment_name' => $r->equipment->equipment_name ?? null,
            'etm_group' => $r->equipment->etm_group ?? null,
            'location' => $r->equipment->location ?? null,
            'pm_number' => $r->equipment->pm_number ?? null,
            'tis_number' => $r->equipment->tis_number ?? null,
            'schedule_id' => $r->schedule->id ?? null,
            'next_maintenance' => $r->schedule->next_maintenance ?? null,
            'technician_name' => $r->technician->name ?? null,
            'technician_email' => $r->technician->email ?? null,
            'checker_name' => $r->checker->name ?? null,
            'validator_name' => $r->validator->name ?? null,
        ];
    }

    private function loadItems($recordId)
    {
        return MaintenanceRecordItems::with('checkItem')
            ->where('maintenance_record_id', $recordId)
            ->get()
            ->sortBy('checkItem.item_number')
            ->map(function ($item) {
                $measurements = $item->measurements ?? [];
                return [
                    'id' => $item->id,
                    'check_item_id' => $item->check_item_id,
                    'status' => $item->status,
                    'remarks' => $item->remarks,
                    'measurements' => $measurements,
                    'completed_pm_types' => $measurements['pm_types_done'] ?? [],
                    'photos' => $item->photos ?? [],
                    'requires_action' => (bool) $item->requires_action,
                    'action_required' => $item->action_required,
                    'actual_man_power' => $item->actual_man_power,
                    'actual_time_minutes' => $item->actual_time_minutes,
                    'item_number' => $item->checkItem->item_number ?? null,
                    'sub_equipment' => $item->checkItem->sub_equipment ?? null,
                    'check_item' => $item->checkItem->check_item ?? null,
                    'maintenance_standard' => $item->checkItem->maintenance_standard ?? null,
                    'pm_types' => $item->checkItem->pm_types ?? [],
                    'man_power' => $item->checkItem->man_power ?? null,
                    'time_minutes' => $item->checkItem->time_minutes ?? null,
                ];
            })
            ->values();
    }

    private function calculateProgress($items)
    {
        $items = collect($items);
        $total = $items->count();
        $done = $items->whereIn('status', ['ok', 'ng', 'na'])->count();
        $ok = $items->where('status', 'ok')->count();
        $ng = $items->where('status', 'ng')->count();
        $pending = $items->where('status', 'pending')->count();
        $percent = $total > 0 ? round(($done / $total) * 100) : 0;

        return compact('total', 'done', 'ok', 'ng', 'pending', 'percent');
    }
}