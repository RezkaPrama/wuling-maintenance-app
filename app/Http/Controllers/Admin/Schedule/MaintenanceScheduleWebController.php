<?php

namespace App\Http\Controllers\Admin\Schedule;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class MaintenanceScheduleWebController extends Controller
{
    // ============================================================
    // INDEX — Daftar jadwal PM + kalender data
    // ============================================================
    public function index(Request $request)
    {
        $filterStatus = $request->input('filter_status');
        $filterCycle  = $request->input('filter_cycle');
        $filterGroup  = $request->input('filter_group');
        $filterMonth  = $request->input('filter_month', now()->format('Y-m'));
        $perPage      = $request->input('per_page', 25);

        $query = DB::table('maintenance_schedules as ms')
            ->join('equipment as e', 'ms.equipment_id', '=', 'e.id')
            ->select(
                'ms.id', 'ms.equipment_id', 'ms.pm_cycle',
                'ms.interval_days', 'ms.last_maintenance',
                'ms.next_maintenance', 'ms.status',
                'e.equipment_code', 'e.equipment_name',
                'e.etm_group', 'e.location',
                'e.status as equipment_status',
            );

        if ($filterStatus && $filterStatus !== 'all') {
            $query->where('ms.status', $filterStatus);
        }
        if ($filterCycle && $filterCycle !== 'all') {
            $query->where('ms.pm_cycle', $filterCycle);
        }
        if ($filterGroup) {
            $query->where('e.etm_group', $filterGroup);
        }

        $query->orderByRaw("CASE ms.status
                WHEN 'overdue'   THEN 1
                WHEN 'due'       THEN 2
                WHEN 'pending'   THEN 3
                WHEN 'completed' THEN 4
                ELSE 5 END")
              ->orderBy('ms.next_maintenance', 'asc');

        $schedules = $query->paginate($perPage)->appends(request()->query());

        // ── Data kalender ──
        [$calYear, $calMonth] = explode('-', $filterMonth);
        $calendarEvents = DB::table('maintenance_schedules as ms')
            ->join('equipment as e', 'ms.equipment_id', '=', 'e.id')
            ->select(
                'ms.id', 'ms.pm_cycle', 'ms.next_maintenance', 'ms.status',
                'e.equipment_code', 'e.equipment_name', 'e.etm_group',
            )
            ->whereYear('ms.next_maintenance', $calYear)
            ->whereMonth('ms.next_maintenance', $calMonth)
            ->orderBy('ms.next_maintenance')
            ->get();

        $calendarData = [];
        foreach ($calendarEvents as $event) {
            $day = (int) date('j', strtotime($event->next_maintenance));
            $calendarData[$day][] = $event;
        }

        // ── Stat cards ──
        $stats = DB::table('maintenance_schedules')
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'due'       THEN 1 ELSE 0 END) as due,
                SUM(CASE WHEN status = 'overdue'   THEN 1 ELSE 0 END) as overdue,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
            ")->first();

        $scheduleThisMonth = DB::table('maintenance_schedules')
            ->whereMonth('next_maintenance', now()->month)
            ->whereYear('next_maintenance', now()->year)
            ->count();

        $etmGroups = DB::table('equipment')
            ->whereNotNull('etm_group')
            ->distinct()->orderBy('etm_group')
            ->pluck('etm_group');

        return view('admin.schedules.index', compact(
            'schedules', 'filterStatus', 'filterCycle', 'filterGroup',
            'filterMonth', 'calendarData', 'calYear', 'calMonth',
            'stats', 'scheduleThisMonth', 'etmGroups',
        ));
    }

    // ============================================================
    // CREATE — Form tambah jadwal baru
    // ============================================================
    public function create(Request $request)
    {
        // Daftar equipment aktif untuk dropdown
        $equipmentList = DB::table('equipment')
            ->where('status', 'active')
            ->orderBy('equipment_name')
            ->get(['id', 'equipment_code', 'equipment_name', 'etm_group', 'location']);

        // Pre-select equipment jika datang dari halaman equipment
        $selectedEquipmentId = $request->input('equipment_id');
        $selectedEquipment   = null;

        if ($selectedEquipmentId) {
            $selectedEquipment = DB::table('equipment')
                ->where('id', $selectedEquipmentId)
                ->first();
        }

        // Cek apakah equipment sudah punya jadwal dengan cycle tertentu
        // (untuk warning duplikasi)
        $existingSchedules = DB::table('maintenance_schedules as ms')
            ->join('equipment as e', 'ms.equipment_id', '=', 'e.id')
            ->select('ms.equipment_id', 'ms.pm_cycle', 'ms.status', 'e.equipment_name')
            ->whereNotIn('ms.status', ['completed'])
            ->get()
            ->groupBy('equipment_id');

        return view('admin.schedules.create', compact(
            'equipmentList',
            'selectedEquipmentId',
            'selectedEquipment',
            'existingSchedules',
        ));
    }

    // ============================================================
    // STORE — Simpan jadwal baru
    // ============================================================
    public function store(Request $request)
    {
        $request->validate([
            'equipment_id'     => 'required|exists:equipment,id',
            'pm_cycle'         => 'required|in:6M,1Y,2Y',
            'next_maintenance' => 'required|date',
            'last_maintenance' => 'nullable|date|before:next_maintenance',
            'interval_days'    => 'nullable|integer|min:1|max:9999',
            'interval_hours'   => 'nullable|integer|min:1|max:99999',
        ]);

        // Cek duplikasi: 1 equipment + 1 pm_cycle yang masih aktif (non-completed)
        $duplicate = DB::table('maintenance_schedules')
            ->where('equipment_id', $request->equipment_id)
            ->where('pm_cycle', $request->pm_cycle)
            ->whereNotIn('status', ['completed'])
            ->exists();

        if ($duplicate) {
            $equipment = DB::table('equipment')->find($request->equipment_id);
            return back()
                ->withInput()
                ->withErrors([
                    'pm_cycle' => "Equipment [{$equipment->equipment_name}] sudah memiliki jadwal PM {$request->pm_cycle} yang aktif.",
                ]);
        }

        // Tentukan status awal berdasarkan next_maintenance
        $nextDate = Carbon::parse($request->next_maintenance);
        $status   = $this->resolveStatus($nextDate);

        // Interval default berdasarkan pm_cycle jika tidak diisi
        $intervalDays = $request->interval_days ?? match ($request->pm_cycle) {
            '6M' => 180,
            '1Y' => 365,
            '2Y' => 730,
        };

        DB::table('maintenance_schedules')->insert([
            'equipment_id'     => $request->equipment_id,
            'pm_cycle'         => $request->pm_cycle,
            'interval_days'    => $intervalDays,
            'interval_hours'   => $request->interval_hours,
            'last_maintenance' => $request->last_maintenance,
            'next_maintenance' => $request->next_maintenance,
            'status'           => $status,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        $equipment = DB::table('equipment')->find($request->equipment_id);

        return redirect()->route('admin.schedules.index')
            ->with('success', "Jadwal PM {$request->pm_cycle} untuk [{$equipment->equipment_name}] berhasil ditambahkan.");
    }

    // ============================================================
    // SHOW — Detail jadwal PM + riwayat record
    // ============================================================
    public function show($id)
    {
        $schedule = DB::table('maintenance_schedules as ms')
            ->join('equipment as e', 'ms.equipment_id', '=', 'e.id')
            ->select(
                'ms.*',
                'e.equipment_code', 'e.equipment_name',
                'e.etm_group', 'e.location',
                'e.status as equipment_status',
                'e.specifications',
            )
            ->where('ms.id', $id)
            ->first();

        if (!$schedule) {
            return redirect()->route('admin.schedules.index')
                ->with('error', 'Jadwal tidak ditemukan.');
        }

        // Riwayat maintenance record untuk jadwal ini
        $records = DB::table('maintenance_records as mr')
            ->join('users as tech', 'mr.technician_id', '=', 'tech.id')
            ->leftJoin('users as checker', 'mr.checker_id', '=', 'checker.id')
            ->leftJoin('check_sheet_templates as cst', 'mr.template_id', '=', 'cst.id')
            ->select(
                'mr.id', 'mr.record_number', 'mr.maintenance_date',
                'mr.start_time', 'mr.end_time', 'mr.status',
                'cst.pm_cycle', 'cst.template_name',
                'tech.name    as technician_name',
                'checker.name as checker_name',
            )
            ->where('mr.schedule_id', $id)
            ->orderBy('mr.maintenance_date', 'desc')
            ->get();

        // Template check sheet yang tersedia
        $templates = DB::table('check_sheet_templates')
            ->where('equipment_id', $schedule->equipment_id)
            ->where('pm_cycle', $schedule->pm_cycle)
            ->where('is_active', 1)
            ->get();

        return view('admin.schedules.show', compact('schedule', 'records', 'templates'));
    }

    // ============================================================
    // EDIT — Form edit jadwal
    // ============================================================
    public function edit($id)
    {
        $schedule = DB::table('maintenance_schedules as ms')
            ->join('equipment as e', 'ms.equipment_id', '=', 'e.id')
            ->select(
                'ms.*',
                'e.equipment_code', 'e.equipment_name',
                'e.etm_group', 'e.location',
            )
            ->where('ms.id', $id)
            ->first();

        if (!$schedule) {
            return redirect()->route('admin.schedules.index')
                ->with('error', 'Jadwal tidak ditemukan.');
        }

        // Semua equipment (untuk ganti equipment jika diperlukan)
        $equipmentList = DB::table('equipment')
            ->where('status', 'active')
            ->orderBy('equipment_name')
            ->get(['id', 'equipment_code', 'equipment_name', 'etm_group']);

        return view('admin.schedules.edit', compact('schedule', 'equipmentList'));
    }

    // ============================================================
    // UPDATE — Simpan perubahan jadwal
    // ============================================================
    public function update(Request $request, $id)
    {
        $schedule = DB::table('maintenance_schedules')->where('id', $id)->first();

        if (!$schedule) {
            return redirect()->route('admin.schedules.index')
                ->with('error', 'Jadwal tidak ditemukan.');
        }

        $request->validate([
            'pm_cycle'         => 'required|in:6M,1Y,2Y',
            'next_maintenance' => 'required|date',
            'last_maintenance' => 'nullable|date|before:next_maintenance',
            'interval_days'    => 'nullable|integer|min:1|max:9999',
            'interval_hours'   => 'nullable|integer|min:1|max:99999',
            'status'           => 'required|in:pending,due,overdue,completed',
        ]);

        // Cek duplikasi hanya jika pm_cycle berubah
        if ($request->pm_cycle !== $schedule->pm_cycle) {
            $duplicate = DB::table('maintenance_schedules')
                ->where('equipment_id', $schedule->equipment_id)
                ->where('pm_cycle', $request->pm_cycle)
                ->where('id', '!=', $id)
                ->whereNotIn('status', ['completed'])
                ->exists();

            if ($duplicate) {
                return back()->withInput()->withErrors([
                    'pm_cycle' => "Equipment ini sudah memiliki jadwal PM {$request->pm_cycle} yang aktif.",
                ]);
            }
        }

        // Recalculate status jika next_maintenance berubah dan status tidak diubah manual
        $status = $request->status;
        if ($request->next_maintenance !== $schedule->next_maintenance && $status !== 'completed') {
            $status = $this->resolveStatus(Carbon::parse($request->next_maintenance));
        }

        $intervalDays = $request->interval_days ?? match ($request->pm_cycle) {
            '6M' => 180,
            '1Y' => 365,
            '2Y' => 730,
        };

        DB::table('maintenance_schedules')->where('id', $id)->update([
            'pm_cycle'         => $request->pm_cycle,
            'interval_days'    => $intervalDays,
            'interval_hours'   => $request->interval_hours,
            'last_maintenance' => $request->last_maintenance,
            'next_maintenance' => $request->next_maintenance,
            'status'           => $status,
            'updated_at'       => now(),
        ]);

        return redirect()->route('admin.schedules.show', $id)
            ->with('success', 'Jadwal PM berhasil diperbarui.');
    }

    // ============================================================
    // DESTROY — Hapus jadwal (cek ada record atau tidak)
    // ============================================================
    public function destroy($id)
    {
        $schedule = DB::table('maintenance_schedules as ms')
            ->join('equipment as e', 'ms.equipment_id', '=', 'e.id')
            ->select('ms.*', 'e.equipment_name', 'e.equipment_code')
            ->where('ms.id', $id)
            ->first();

        if (!$schedule) {
            return redirect()->route('admin.schedules.index')
                ->with('error', 'Jadwal tidak ditemukan.');
        }

        // Cegah hapus jika ada maintenance record yang terhubung
        $recordCount = DB::table('maintenance_records')
            ->where('schedule_id', $id)
            ->count();

        if ($recordCount > 0) {
            return redirect()->route('admin.schedules.show', $id)
                ->with('error', "Jadwal tidak dapat dihapus karena sudah memiliki {$recordCount} maintenance record.");
        }

        DB::table('maintenance_schedules')->where('id', $id)->delete();

        return redirect()->route('admin.schedules.index')
            ->with('success', "Jadwal PM {$schedule->pm_cycle} untuk [{$schedule->equipment_name}] berhasil dihapus.");
    }

    // ============================================================
    // RECALCULATE STATUS — Update otomatis status semua jadwal
    // (bisa dipanggil via scheduled command / artisan)
    // ============================================================
    public function recalculateStatus()
    {
        $schedules = DB::table('maintenance_schedules')
            ->whereNotIn('status', ['completed'])
            ->get();

        $updated = 0;
        foreach ($schedules as $s) {
            $newStatus = $this->resolveStatus(Carbon::parse($s->next_maintenance));
            if ($newStatus !== $s->status) {
                DB::table('maintenance_schedules')
                    ->where('id', $s->id)
                    ->update(['status' => $newStatus, 'updated_at' => now()]);
                $updated++;
            }
        }

        return redirect()->route('admin.schedules.index')
            ->with('success', "{$updated} jadwal berhasil diperbarui statusnya.");
    }

    // ============================================================
    // PRIVATE HELPER — Tentukan status berdasarkan next_maintenance
    // ============================================================
    private function resolveStatus(Carbon $nextDate): string
    {
        $daysLeft = now()->startOfDay()->diffInDays($nextDate->startOfDay(), false);

        if ($daysLeft < 0) {
            return 'overdue';                  // sudah lewat
        } elseif ($daysLeft <= 14) {
            return 'due';                      // ≤ 14 hari ke depan
        } else {
            return 'pending';                  // masih jauh
        }
    }
}