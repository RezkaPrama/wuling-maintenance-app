<?php

namespace App\Http\Controllers\Admin\Dashboard;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $today = Carbon::today();

        // ============================================================
        // STAT CARDS — ringkasan utama
        // ============================================================

        // Total equipment aktif
        $totalEquipment = DB::table('equipment')
            ->where('status', 'active')
            ->count();

        // Total equipment inactive / sedang maintenance
        $totalEquipmentInactive = DB::table('equipment')
            ->whereIn('status', ['inactive', 'maintenance'])
            ->count();

        // Jadwal PM bulan ini
        $schedulesThisMonth = DB::table('maintenance_schedules')
            ->whereMonth('next_maintenance', $today->month)
            ->whereYear('next_maintenance', $today->year)
            ->count();

        // PM Due (jatuh tempo hari ini atau sudah lewat, belum completed)
        $schedulesDue = DB::table('maintenance_schedules')
            ->where('status', 'due')
            ->count();

        // PM Overdue (terlambat)
        $schedulesOverdue = DB::table('maintenance_schedules')
            ->where('status', 'overdue')
            ->count();

        // Record sedang berjalan (in_progress)
        $recordsInProgress = DB::table('maintenance_records')
            ->where('status', 'in_progress')
            ->count();

        // Record menunggu validasi
        $recordsNeedValidation = DB::table('maintenance_records')
            ->where('status', 'completed')
            ->count();

        // ============================================================
        // TABEL JADWAL TERDEKAT — due & overdue dulu, lalu pending
        // ============================================================
        $upcomingSchedules = DB::table('maintenance_schedules as ms')
            ->join('equipment as e', 'ms.equipment_id', '=', 'e.id')
            ->select(
                'ms.id',
                'e.equipment_code',
                'e.equipment_name',
                'e.location',
                'ms.pm_cycle',
                'ms.next_maintenance',
                'ms.last_maintenance',
                'ms.status',
            )
            ->whereIn('ms.status', ['pending', 'due', 'overdue'])
            ->orderByRaw("CASE ms.status
                WHEN 'overdue' THEN 1
                WHEN 'due'     THEN 2
                WHEN 'pending' THEN 3
                ELSE 4 END")
            ->orderBy('ms.next_maintenance', 'asc')
            ->limit(10)
            ->get();

        // ============================================================
        // RECORD IN PROGRESS — terbaru
        // ============================================================
        $activeRecords = DB::table('maintenance_records as mr')
            ->join('equipment as e', 'mr.equipment_id', '=', 'e.id')
            ->join('users as u', 'mr.technician_id', '=', 'u.id')
            ->select(
                'mr.id',
                'mr.record_number',
                'mr.maintenance_date',
                'mr.start_time',
                'mr.status',
                'e.equipment_name',
                'e.equipment_code',
                'u.name as technician_name',
            )
            ->where('mr.status', 'in_progress')
            ->orderBy('mr.created_at', 'desc')
            ->limit(5)
            ->get();

        // ============================================================
        // EQUIPMENT STATUS — list mesin bermasalah
        // ============================================================
        $equipmentIssues = DB::table('equipment')
            ->select('id', 'equipment_code', 'equipment_name', 'location', 'status', 'etm_group')
            ->whereIn('status', ['inactive', 'maintenance'])
            ->orderBy('status')
            ->get();

        // ============================================================
        // CHART — PM per bulan (6 bulan terakhir)
        // ============================================================
        $pmChartData = DB::table('maintenance_records')
            ->select(
                DB::raw('YEAR(maintenance_date) as year'),
                DB::raw('MONTH(maintenance_date) as month'),
                DB::raw('COUNT(*) as total'),
                DB::raw("SUM(CASE WHEN status = 'validated' THEN 1 ELSE 0 END) as selesai"),
                DB::raw("SUM(CASE WHEN status IN ('in_progress','completed') THEN 1 ELSE 0 END) as berjalan"),
            )
            ->where('maintenance_date', '>=', $today->copy()->subMonths(5)->startOfMonth())
            ->groupByRaw('YEAR(maintenance_date), MONTH(maintenance_date)')
            ->orderByRaw('YEAR(maintenance_date), MONTH(maintenance_date)')
            ->get();

        // Format label bulan (Jan, Feb, ...) dan data untuk Chart.js
        $chartLabels    = [];
        $chartSelesai   = [];
        $chartBerjalan  = [];

        // Pastikan 6 bulan selalu ada (isi 0 jika tidak ada data)
        for ($i = 5; $i >= 0; $i--) {
            $bulan = $today->copy()->subMonths($i);
            $key   = $bulan->year . '-' . $bulan->month;
            $chartLabels[] = $bulan->translatedFormat('M Y');

            $found = $pmChartData->first(fn($d) => $d->year == $bulan->year && $d->month == $bulan->month);
            $chartSelesai[]  = $found ? (int) $found->selesai  : 0;
            $chartBerjalan[] = $found ? (int) $found->berjalan  : 0;
        }

        // ============================================================
        // CHART — distribusi PM cycle (6M / 1Y / 2Y)
        // ============================================================
        $pmCycleData = DB::table('maintenance_schedules')
            ->select('pm_cycle', DB::raw('COUNT(*) as total'))
            ->groupBy('pm_cycle')
            ->pluck('total', 'pm_cycle')
            ->toArray();

        $cycleLabels = ['6M', '1Y', '2Y'];
        $cycleData   = array_map(fn($c) => $pmCycleData[$c] ?? 0, $cycleLabels);

        // ============================================================
        // RECORD COMPLETED BULAN INI (untuk stat bawah)
        // ============================================================
        $recordsCompletedThisMonth = DB::table('maintenance_records')
            ->whereIn('status', ['completed', 'validated'])
            ->whereMonth('maintenance_date', $today->month)
            ->whereYear('maintenance_date', $today->year)
            ->count();

        return view('admin.dashboard.index', compact(
            // Stat cards
            'totalEquipment',
            'totalEquipmentInactive',
            'schedulesThisMonth',
            'schedulesDue',
            'schedulesOverdue',
            'recordsInProgress',
            'recordsNeedValidation',
            'recordsCompletedThisMonth',
            // Tables
            'upcomingSchedules',
            'activeRecords',
            'equipmentIssues',
            // Charts
            'chartLabels',
            'chartSelesai',
            'chartBerjalan',
            'cycleLabels',
            'cycleData',
        ));
    }
}
