<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Equipment;
use App\Models\MaintenanceRecords;
use App\Models\MaintenanceSchedules;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MaintenanceScheduleController extends Controller
{
    // Mapping cycle -> jumlah bulan, dipakai untuk hitung next_maintenance otomatis
    protected const CYCLE_MONTHS = [
        '1M' => 1,
        '3M' => 3,
        '6M' => 6,
        '1Y' => 12,
    ];

    // Ambang hari sebelum next_maintenance dianggap status "due"
    protected const DUE_THRESHOLD_DAYS = 7;

    public function index(Request $request)
    {
        $filterMonth = $request->get('filter_month', now()->format('Y-m'));
        [$year, $month] = array_map('intval', explode('-', $filterMonth));

        $query = MaintenanceSchedules::with('equipment');

        if ($request->filled('filter_status')) {
            $query->where('status', $request->filter_status);
        }

        if ($request->filled('filter_cycle')) {
            $query->where('pm_cycle', $request->filter_cycle);
        }

        if ($request->filled('filter_group')) {
            $query->whereHas('equipment', function ($q) use ($request) {
                $q->where('etm_group', $request->filter_group);
            });
        }

        $schedules = $query->orderBy('next_maintenance', 'asc')->paginate(10);

        $schedules->getCollection()->transform(fn($s) => [
            'id' => $s->id,
            'equipment_id' => $s->equipment_id,
            'equipment_name' => $s->equipment->equipment_name ?? '-',
            'equipment_code' => $s->equipment->equipment_code ?? '-',
            'equipment_status' => $s->equipment->status ?? null,
            'etm_group' => $s->equipment->etm_group ?? null,
            'pm_cycle' => $s->pm_cycle,
            'last_maintenance' => $s->last_maintenance,
            'next_maintenance' => $s->next_maintenance,
            'status' => $s->status,
        ]);

        $calendarEvents = MaintenanceSchedules::with('equipment')
            ->whereYear('next_maintenance', $year)
            ->whereMonth('next_maintenance', $month)
            ->get()
            ->map(fn($s) => [
                'id' => $s->id,
                'equipment_name' => $s->equipment->equipment_name ?? '-',
                'equipment_code' => $s->equipment->equipment_code ?? '-',
                'pm_cycle' => $s->pm_cycle,
                'next_maintenance' => $s->next_maintenance,
                'status' => $s->status,
            ]);

        $stats = [
            'total' => MaintenanceSchedules::count(),
            'pending' => MaintenanceSchedules::where('status', 'pending')->count(),
            'due' => MaintenanceSchedules::where('status', 'due')->count(),
            'overdue' => MaintenanceSchedules::where('status', 'overdue')->count(),
            'completed' => MaintenanceSchedules::where('status', 'completed')->count(),
        ];

        $scheduleThisMonth = MaintenanceSchedules::whereYear('next_maintenance', $year)
            ->whereMonth('next_maintenance', $month)
            ->count();

        $etmGroups = Equipment::whereNotNull('etm_group')
            ->distinct()
            ->orderBy('etm_group')
            ->pluck('etm_group');

        return response()->json([
            'schedules' => $schedules,
            'calendar' => ['year' => $year, 'month' => $month, 'events' => $calendarEvents],
            'stats' => $stats,
            'schedule_this_month' => $scheduleThisMonth,
            'etm_groups' => $etmGroups,
        ]);
    }

    public function formData()
    {
        return response()->json([
            'equipment_list' => Equipment::select('id', 'equipment_code', 'equipment_name', 'etm_group', 'machine_category', 'status')
                ->orderBy('equipment_name')
                ->get(),
            'existing_schedules' => MaintenanceSchedules::select('id', 'equipment_id', 'pm_cycle', 'status')->get(),
        ]);
    }

    public function show($id)
    {
        $schedule = MaintenanceSchedules::with([
            'equipment.checkSheetTemplates' => fn($q) => $q->where('is_active', true),
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $schedule,
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'equipment_id' => 'required|exists:equipment,id',
            'pm_cycle' => 'required|in:' . implode(',', array_keys(self::CYCLE_MONTHS)),
            'last_maintenance' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Data tidak valid.', 'errors' => $validator->errors()], 422);
        }

        $existing = MaintenanceSchedules::where('equipment_id', $request->equipment_id)->first();
        if ($existing) {
            return response()->json([
                'message' => 'Equipment ini sudah memiliki jadwal PM. Silakan edit jadwal yang sudah ada.',
            ], 422);
        }

        $lastMaintenance = $request->last_maintenance ? Carbon::parse($request->last_maintenance) : now();
        $nextMaintenance = $this->calculateNextMaintenance($lastMaintenance, $request->pm_cycle);

        $schedule = MaintenanceSchedules::create([
            'equipment_id' => $request->equipment_id,
            'pm_cycle' => $request->pm_cycle,
            'last_maintenance' => $lastMaintenance->toDateString(),
            'next_maintenance' => $nextMaintenance->toDateString(),
            'status' => $this->resolveStatus($nextMaintenance),
        ]);

        return response()->json([
            'message' => 'Jadwal PM berhasil dibuat.',
            'data' => $schedule,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $schedule = MaintenanceSchedules::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'pm_cycle' => 'required|in:' . implode(',', array_keys(self::CYCLE_MONTHS)),
            'last_maintenance' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Data tidak valid.', 'errors' => $validator->errors()], 422);
        }

        $lastMaintenance = $request->last_maintenance
            ? Carbon::parse($request->last_maintenance)
            : ($schedule->last_maintenance ? Carbon::parse($schedule->last_maintenance) : now());

        $nextMaintenance = $this->calculateNextMaintenance($lastMaintenance, $request->pm_cycle);

        $schedule->update([
            'pm_cycle' => $request->pm_cycle,
            'last_maintenance' => $lastMaintenance->toDateString(),
            'next_maintenance' => $nextMaintenance->toDateString(),
            'status' => $this->resolveStatus($nextMaintenance),
        ]);

        return response()->json([
            'message' => 'Jadwal PM berhasil diperbarui.',
            'data' => $schedule,
        ]);
    }

    public function destroy($id)
    {
        MaintenanceSchedules::findOrFail($id)->delete();

        return response()->json(['message' => 'Jadwal PM berhasil dihapus.']);
    }

    // dipanggil tombol "Sync Status" di React — recalc status semua schedule berdasar tanggal hari ini
    public function recalculateStatus()
    {
        $updated = 0;

        MaintenanceSchedules::where('status', '!=', 'completed')
            ->chunkById(100, function ($schedules) use (&$updated) {
                foreach ($schedules as $schedule) {
                    $newStatus = $this->resolveStatus(Carbon::parse($schedule->next_maintenance));
                    if ($newStatus !== $schedule->status) {
                        $schedule->update(['status' => $newStatus]);
                        $updated++;
                    }
                }
            });

        return response()->json([
            'message' => "Sync status selesai. {$updated} jadwal diperbarui.",
        ]);
    }

    public function getDashboardSummary()
    {
        $summary = [
            'overdue' => MaintenanceSchedules::where('next_maintenance', '<', now())
                ->where('status', '!=', 'completed')->count(),
            'due_today' => MaintenanceSchedules::whereDate('next_maintenance', today())
                ->where('status', '!=', 'completed')->count(),
            'due_this_week' => MaintenanceSchedules::whereBetween('next_maintenance', [now(), now()->addDays(7)])
                ->where('status', '!=', 'completed')->count(),
            'in_progress' => MaintenanceRecords::where('status', 'in_progress')->count(),
            'completed_today' => MaintenanceRecords::whereDate('created_at', today())
                ->where('status', 'completed')->count(),
        ];

        return response()->json(['success' => true, 'data' => $summary]);
    }

    /** Hitung next_maintenance otomatis dari last_maintenance + periode cycle */
    protected function calculateNextMaintenance(Carbon $lastMaintenance, string $cycle): Carbon
    {
        $months = self::CYCLE_MONTHS[$cycle] ?? 1;
        return $lastMaintenance->copy()->addMonths($months);
    }

    /** Tentukan status berdasar selisih next_maintenance ke hari ini */
    protected function resolveStatus(Carbon $nextMaintenance): string
    {
        $today = Carbon::today();

        if ($nextMaintenance->lt($today)) {
            return 'overdue';
        }

        if ($today->diffInDays($nextMaintenance) <= self::DUE_THRESHOLD_DAYS) {
            return 'due';
        }

        return 'pending';
    }
}
