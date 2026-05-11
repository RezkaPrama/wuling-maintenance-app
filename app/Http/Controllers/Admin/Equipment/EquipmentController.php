<?php

namespace App\Http\Controllers\Admin\Equipment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EquipmentController extends Controller
{
    // ============================================================
    // INDEX — Daftar semua equipment dengan filter
    // ============================================================
    public function index(Request $request)
    {
        $search       = $request->input('search');
        $filterStatus = $request->input('filter_status');
        $filterGroup  = $request->input('filter_group');
        $filterLoc    = $request->input('filter_location');
        $perPage      = $request->input('per_page', 25);

        $query = DB::table('equipment as e')
            ->leftJoin('maintenance_schedules as ms', function ($join) {
                // Ambil schedule terbaru per equipment
                $join->on('ms.equipment_id', '=', 'e.id')
                     ->whereRaw('ms.id = (
                         SELECT id FROM maintenance_schedules
                         WHERE equipment_id = e.id
                         ORDER BY next_maintenance ASC
                         LIMIT 1
                     )');
            })
            ->select(
                'e.id',
                'e.equipment_code',
                'e.equipment_name',
                'e.pm_number',
                'e.tis_number',
                'e.etm_group',
                'e.location',
                'e.status',
                'e.specifications',
                'ms.pm_cycle',
                'ms.next_maintenance',
                'ms.last_maintenance',
                'ms.status as schedule_status',
            );

        // Filter pencarian global
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('e.equipment_code',  'LIKE', "%{$search}%")
                  ->orWhere('e.equipment_name', 'LIKE', "%{$search}%")
                  ->orWhere('e.pm_number',      'LIKE', "%{$search}%")
                  ->orWhere('e.etm_group',      'LIKE', "%{$search}%")
                  ->orWhere('e.location',       'LIKE', "%{$search}%");
            });
        }

        // Filter status equipment
        if ($filterStatus && $filterStatus !== 'all') {
            $query->where('e.status', $filterStatus);
        }

        // Filter ETM Group
        if ($filterGroup) {
            $query->where('e.etm_group', $filterGroup);
        }

        // Filter lokasi
        if ($filterLoc) {
            $query->where('e.location', $filterLoc);
        }

        // Urutan: bermasalah (overdue/due) dulu, lalu aktif
        $query->orderByRaw("CASE e.status
                WHEN 'maintenance' THEN 1
                WHEN 'inactive'    THEN 2
                WHEN 'active'      THEN 3
                ELSE 4 END")
              ->orderBy('e.equipment_name');

        $equipments = $query->paginate($perPage)->appends([
            'search'          => $search,
            'filter_status'   => $filterStatus,
            'filter_group'    => $filterGroup,
            'filter_location' => $filterLoc,
            'per_page'        => $perPage,
        ]);

        // ── Stat cards ──
        $totalActive      = DB::table('equipment')->where('status', 'active')->count();
        $totalMaintenance = DB::table('equipment')->where('status', 'maintenance')->count();
        $totalInactive    = DB::table('equipment')->where('status', 'inactive')->count();
        $totalOverdue     = DB::table('maintenance_schedules')->where('status', 'overdue')->count();

        // ── Dropdown filter ──
        $etmGroups = DB::table('equipment')
            ->whereNotNull('etm_group')
            ->distinct()->orderBy('etm_group')
            ->pluck('etm_group');

        $locations = DB::table('equipment')
            ->whereNotNull('location')
            ->distinct()->orderBy('location')
            ->pluck('location');

        return view('admin.equipment.index', compact(
            'equipments',
            'search',
            'filterStatus',
            'filterGroup',
            'filterLoc',
            'totalActive',
            'totalMaintenance',
            'totalInactive',
            'totalOverdue',
            'etmGroups',
            'locations',
        ));
    }

    // ============================================================
    // SHOW — Detail equipment + riwayat maintenance
    // ============================================================
    public function show(Request $request, $id)
    {
        // Data equipment
        $equipment = DB::table('equipment')->where('id', $id)->first();

        if (!$equipment) {
            return redirect()->route('admin.equipment.index')
                ->with('error', 'Equipment tidak ditemukan.');
        }

        // Decode specifications JSON jika ada
        $specifications = [];
        if ($equipment->specifications) {
            $specifications = json_decode($equipment->specifications, true) ?? [];
        }

        // ── Jadwal PM aktif (semua schedule untuk equipment ini) ──
        $schedules = DB::table('maintenance_schedules')
            ->where('equipment_id', $id)
            ->orderBy('next_maintenance', 'asc')
            ->get();

        // ── Riwayat maintenance records ──
        $filterYear    = $request->input('filter_year');
        $filterStatus  = $request->input('filter_status');
        $perPage       = $request->input('per_page', 10);

        $historyQuery = DB::table('maintenance_records as mr')
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
                'tech.name      as technician_name',
                'checker.name   as checker_name',
                'validator.name as validator_name',
            )
            ->where('mr.equipment_id', $id);

        if ($filterYear) {
            $historyQuery->whereYear('mr.maintenance_date', $filterYear);
        }

        if ($filterStatus && $filterStatus !== 'all') {
            $historyQuery->where('mr.status', $filterStatus);
        }

        $historyQuery->orderBy('mr.maintenance_date', 'desc');

        $maintenanceHistory = $historyQuery->paginate($perPage)->appends([
            'filter_year'   => $filterYear,
            'filter_status' => $filterStatus,
            'per_page'      => $perPage,
        ]);

        // ── Stat untuk equipment ini ──
        $totalPMDone = DB::table('maintenance_records')
            ->where('equipment_id', $id)
            ->whereIn('status', ['completed', 'validated'])
            ->count();

        $totalPMAll = DB::table('maintenance_records')
            ->where('equipment_id', $id)
            ->count();

        $lastRecord = DB::table('maintenance_records')
            ->where('equipment_id', $id)
            ->orderBy('maintenance_date', 'desc')
            ->first();

        // ── Chart: PM per tahun (bar) ──
        $pmPerYear = DB::table('maintenance_records')
            ->select(
                DB::raw('YEAR(maintenance_date) as year'),
                DB::raw('COUNT(*) as total'),
                DB::raw("SUM(CASE WHEN status = 'validated' THEN 1 ELSE 0 END) as validated"),
            )
            ->where('equipment_id', $id)
            ->groupByRaw('YEAR(maintenance_date)')
            ->orderBy('year', 'desc')
            ->limit(5)
            ->get()
            ->sortBy('year');

        $chartYearLabels    = $pmPerYear->pluck('year')->map(fn($y) => (string)$y)->values()->toArray();
        $chartYearTotal     = $pmPerYear->pluck('total')->map(fn($v) => (int)$v)->values()->toArray();
        $chartYearValidated = $pmPerYear->pluck('validated')->map(fn($v) => (int)$v)->values()->toArray();

        // ── Dropdown filter tahun ──
        $availableYears = DB::table('maintenance_records')
            ->where('equipment_id', $id)
            ->selectRaw('YEAR(maintenance_date) as year')
            ->distinct()
            ->orderBy('year', 'desc')
            ->pluck('year');

        return view('admin.equipment.show', compact(
            'equipment',
            'specifications',
            'schedules',
            'maintenanceHistory',
            'filterYear',
            'filterStatus',
            'totalPMDone',
            'totalPMAll',
            'lastRecord',
            'chartYearLabels',
            'chartYearTotal',
            'chartYearValidated',
            'availableYears',
        ));
    }
}
