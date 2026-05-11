<?php

namespace App\Http\Controllers\Admin\Schedule;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class MaintenanceScheduleWebController extends Controller
{
    // ============================================================
    // INDEX — Daftar jadwal PM + kalender data
    // ============================================================
    public function index(Request $request)
    {
        $filterStatus   = $request->input('filter_status');
        $filterCycle    = $request->input('filter_cycle');
        $filterGroup    = $request->input('filter_group');
        $filterMonth    = $request->input('filter_month', now()->format('Y-m')); // default bulan ini
        $perPage        = $request->input('per_page', 25);

        // ── Query list jadwal ──
        $query = DB::table('maintenance_schedules as ms')
            ->join('equipment as e', 'ms.equipment_id', '=', 'e.id')
            ->select(
                'ms.id',
                'ms.equipment_id',
                'ms.pm_cycle',
                'ms.interval_days',
                'ms.last_maintenance',
                'ms.next_maintenance',
                'ms.status',
                'e.equipment_code',
                'e.equipment_name',
                'e.etm_group',
                'e.location',
                'e.status as equipment_status',
            );

        // Filter status schedule
        if ($filterStatus && $filterStatus !== 'all') {
            $query->where('ms.status', $filterStatus);
        }

        // Filter PM cycle
        if ($filterCycle && $filterCycle !== 'all') {
            $query->where('ms.pm_cycle', $filterCycle);
        }

        // Filter ETM group
        if ($filterGroup) {
            $query->where('e.etm_group', $filterGroup);
        }

        // Urutan: overdue → due → pending → completed
        $query->orderByRaw("CASE ms.status
                WHEN 'overdue'   THEN 1
                WHEN 'due'       THEN 2
                WHEN 'pending'   THEN 3
                WHEN 'completed' THEN 4
                ELSE 5 END")
              ->orderBy('ms.next_maintenance', 'asc');

        $schedules = $query->paginate($perPage)->appends([
            'filter_status' => $filterStatus,
            'filter_cycle'  => $filterCycle,
            'filter_group'  => $filterGroup,
            'filter_month'  => $filterMonth,
            'per_page'      => $perPage,
        ]);

        // ── Data kalender: semua jadwal dalam bulan terpilih ──
        [$calYear, $calMonth] = explode('-', $filterMonth);
        $calendarEvents = DB::table('maintenance_schedules as ms')
            ->join('equipment as e', 'ms.equipment_id', '=', 'e.id')
            ->select(
                'ms.id',
                'ms.pm_cycle',
                'ms.next_maintenance',
                'ms.status',
                'e.equipment_code',
                'e.equipment_name',
                'e.etm_group',
            )
            ->whereYear('ms.next_maintenance', $calYear)
            ->whereMonth('ms.next_maintenance', $calMonth)
            ->orderBy('ms.next_maintenance')
            ->get();

        // Group kalender per tanggal
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
            ")
            ->first();

        // Jadwal bulan ini (untuk stat)
        $scheduleThisMonth = DB::table('maintenance_schedules')
            ->whereMonth('next_maintenance', now()->month)
            ->whereYear('next_maintenance', now()->year)
            ->count();

        // ── Dropdown filter ──
        $etmGroups = DB::table('equipment')
            ->whereNotNull('etm_group')
            ->distinct()->orderBy('etm_group')
            ->pluck('etm_group');

        return view('admin.schedules.index', compact(
            'schedules',
            'filterStatus',
            'filterCycle',
            'filterGroup',
            'filterMonth',
            'calendarData',
            'calYear',
            'calMonth',
            'stats',
            'scheduleThisMonth',
            'etmGroups',
        ));
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
                'e.equipment_code',
                'e.equipment_name',
                'e.etm_group',
                'e.location',
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
                'mr.id',
                'mr.record_number',
                'mr.maintenance_date',
                'mr.start_time',
                'mr.end_time',
                'mr.status',
                'cst.pm_cycle',
                'tech.name as technician_name',
                'checker.name as checker_name',
            )
            ->where('mr.schedule_id', $id)
            ->orderBy('mr.maintenance_date', 'desc')
            ->get();

        // Template check sheet yang tersedia untuk equipment ini
        $templates = DB::table('check_sheet_templates')
            ->where('equipment_id', $schedule->equipment_id)
            ->where('pm_cycle', $schedule->pm_cycle)
            ->where('is_active', 1)
            ->get();

        return view('admin.schedules.show', compact(
            'schedule',
            'records',
            'templates',
        ));
    }
}
