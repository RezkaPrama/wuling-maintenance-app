<?php

namespace App\Http\Controllers\Admin\Equipment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Helpers\QrCodeHelper;

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
                $join->on('ms.equipment_id', '=', 'e.id')
                     ->whereRaw('ms.id = (
                         SELECT id FROM maintenance_schedules
                         WHERE equipment_id = e.id
                         ORDER BY next_maintenance ASC
                         LIMIT 1
                     )');
            })
            ->select(
                'e.id', 'e.equipment_code', 'e.equipment_name',
                'e.pm_number', 'e.tis_number', 'e.etm_group',
                'e.location', 'e.status',
                'ms.pm_cycle', 'ms.next_maintenance',
                'ms.last_maintenance', 'ms.status as schedule_status',
            );

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('e.equipment_code',  'LIKE', "%{$search}%")
                  ->orWhere('e.equipment_name', 'LIKE', "%{$search}%")
                  ->orWhere('e.pm_number',      'LIKE', "%{$search}%")
                  ->orWhere('e.etm_group',      'LIKE', "%{$search}%")
                  ->orWhere('e.location',       'LIKE', "%{$search}%");
            });
        }

        if ($filterStatus && $filterStatus !== 'all') {
            $query->where('e.status', $filterStatus);
        }

        if ($filterGroup)  $query->where('e.etm_group', $filterGroup);
        if ($filterLoc)    $query->where('e.location',  $filterLoc);

        $query->orderByRaw("CASE e.status
                WHEN 'maintenance' THEN 1
                WHEN 'inactive'    THEN 2
                WHEN 'active'      THEN 3
                ELSE 4 END")
              ->orderBy('e.equipment_name');

        $equipments = $query->paginate($perPage)->appends(request()->query());

        // Stat cards
        $totalActive      = DB::table('equipment')->where('status', 'active')->count();
        $totalMaintenance = DB::table('equipment')->where('status', 'maintenance')->count();
        $totalInactive    = DB::table('equipment')->where('status', 'inactive')->count();
        $totalOverdue     = DB::table('maintenance_schedules')->where('status', 'overdue')->count();

        $etmGroups = DB::table('equipment')->whereNotNull('etm_group')
            ->distinct()->orderBy('etm_group')->pluck('etm_group');

        $locations = DB::table('equipment')->whereNotNull('location')
            ->distinct()->orderBy('location')->pluck('location');

        return view('admin.equipment.index', compact(
            'equipments', 'search', 'filterStatus', 'filterGroup', 'filterLoc',
            'totalActive', 'totalMaintenance', 'totalInactive', 'totalOverdue',
            'etmGroups', 'locations',
        ));
    }

    // ============================================================
    // CREATE — Form tambah equipment baru
    // ============================================================
    public function create()
    {
        $etmGroups = DB::table('equipment')->whereNotNull('etm_group')
            ->distinct()->orderBy('etm_group')->pluck('etm_group');

        $locations = DB::table('equipment')->whereNotNull('location')
            ->distinct()->orderBy('location')->pluck('location');

        return view('admin.equipment.create', compact('etmGroups', 'locations'));
    }

    // ============================================================
    // STORE — Simpan equipment baru
    // ============================================================
    public function store(Request $request)
    {
        $request->validate([
            'equipment_code' => 'required|string|max:255|unique:equipment,equipment_code',
            'equipment_name' => 'required|string|max:255',
            'pm_number'      => 'required|string|max:255',
            'tis_number'     => 'nullable|string|max:255',
            'etm_group'      => 'required|string|max:255',
            'location'       => 'nullable|string|max:255',
            'status'         => 'required|in:active,inactive,maintenance',
            'spec_key'       => 'nullable|array',
            'spec_key.*'     => 'nullable|string|max:100',
            'spec_value'     => 'nullable|array',
            'spec_value.*'   => 'nullable|string|max:255',
        ]);

        $specifications = $this->buildSpecifications(
            $request->input('spec_key', []),
            $request->input('spec_value', [])
        );

        $id = DB::table('equipment')->insertGetId([
            'equipment_code' => strtoupper(trim($request->equipment_code)),
            'equipment_name' => $request->equipment_name,
            'pm_number'      => $request->pm_number,
            'tis_number'     => $request->tis_number,
            'etm_group'      => $request->etm_group,
            'location'       => $request->location,
            'status'         => $request->status,
            'specifications' => $specifications ? json_encode($specifications) : null,
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        return redirect()
            ->route('admin.equipment.show', $id)
            ->with('success', "Equipment {$request->equipment_name} berhasil ditambahkan.");
    }

    // ============================================================
    // SHOW — Detail + QR Code (hanya di halaman ini, bukan index)
    // ============================================================
    public function show(Request $request, $id)
    {
        $equipment = DB::table('equipment')->where('id', $id)->first();

        if (!$equipment) {
            return redirect()->route('admin.equipment.index')
                ->with('error', 'Equipment tidak ditemukan.');
        }

        $specifications = [];
        if ($equipment->specifications) {
            $specifications = json_decode($equipment->specifications, true) ?? [];
        }

        $schedules = DB::table('maintenance_schedules')
            ->where('equipment_id', $id)
            ->orderBy('next_maintenance', 'asc')
            ->get();

        $filterYear   = $request->input('filter_year');
        $filterStatus = $request->input('filter_status');
        $perPage      = $request->input('per_page', 10);

        $historyQuery = DB::table('maintenance_records as mr')
            ->join('users as tech',             'mr.technician_id', '=', 'tech.id')
            ->leftJoin('users as checker',       'mr.checker_id',    '=', 'checker.id')
            ->leftJoin('users as validator',     'mr.validator_id',  '=', 'validator.id')
            ->leftJoin('check_sheet_templates as cst', 'mr.template_id', '=', 'cst.id')
            ->select(
                'mr.id', 'mr.record_number', 'mr.maintenance_date',
                'mr.start_time', 'mr.end_time', 'mr.status', 'mr.notes',
                'cst.pm_cycle', 'cst.template_name',
                'tech.name      as technician_name',
                'checker.name   as checker_name',
                'validator.name as validator_name',
            )
            ->where('mr.equipment_id', $id);

        if ($filterYear) $historyQuery->whereYear('mr.maintenance_date', $filterYear);
        if ($filterStatus && $filterStatus !== 'all') $historyQuery->where('mr.status', $filterStatus);

        $maintenanceHistory = $historyQuery
            ->orderBy('mr.maintenance_date', 'desc')
            ->paginate($perPage)->appends(request()->query());

        $totalPMDone = DB::table('maintenance_records')
            ->where('equipment_id', $id)->whereIn('status', ['completed','validated'])->count();
        $totalPMAll  = DB::table('maintenance_records')->where('equipment_id', $id)->count();
        $lastRecord  = DB::table('maintenance_records')
            ->where('equipment_id', $id)->orderBy('maintenance_date', 'desc')->first();

        $pmPerYear = DB::table('maintenance_records')
            ->select(
                DB::raw('YEAR(maintenance_date) as year'),
                DB::raw('COUNT(*) as total'),
                DB::raw("SUM(CASE WHEN status='validated' THEN 1 ELSE 0 END) as validated"),
            )
            ->where('equipment_id', $id)
            ->groupByRaw('YEAR(maintenance_date)')
            ->orderBy('year')->limit(5)->get()->sortBy('year');

        $chartYearLabels    = $pmPerYear->pluck('year')->map(fn($y) => (string)$y)->values()->toArray();
        $chartYearTotal     = $pmPerYear->pluck('total')->map(fn($v) => (int)$v)->values()->toArray();
        $chartYearValidated = $pmPerYear->pluck('validated')->map(fn($v) => (int)$v)->values()->toArray();

        $availableYears = DB::table('maintenance_records')
            ->where('equipment_id', $id)
            ->selectRaw('YEAR(maintenance_date) as year')
            ->distinct()->orderBy('year', 'desc')->pluck('year');

        // ── QR Code — hanya di-generate di show, BUKAN di index ──
        // URL yang di-encode mengarah ke create record dengan equipment_id terisi
        $qrUrl  = route('admin.records.create', ['equipment_id' => $id]);
        $qrCode = QrCodeHelper::svgBase64($qrUrl, 220);

        return view('admin.equipment.show', compact(
            'equipment', 'specifications', 'schedules',
            'maintenanceHistory', 'filterYear', 'filterStatus',
            'totalPMDone', 'totalPMAll', 'lastRecord',
            'chartYearLabels', 'chartYearTotal', 'chartYearValidated',
            'availableYears', 'qrCode', 'qrUrl',
        ));
    }

    // ============================================================
    // EDIT — Form edit equipment
    // ============================================================
    public function edit($id)
    {
        $equipment = DB::table('equipment')->where('id', $id)->first();

        if (!$equipment) {
            return redirect()->route('admin.equipment.index')
                ->with('error', 'Equipment tidak ditemukan.');
        }

        $specifications = [];
        if ($equipment->specifications) {
            $specifications = json_decode($equipment->specifications, true) ?? [];
        }

        $etmGroups = DB::table('equipment')->whereNotNull('etm_group')
            ->distinct()->orderBy('etm_group')->pluck('etm_group');

        $locations = DB::table('equipment')->whereNotNull('location')
            ->distinct()->orderBy('location')->pluck('location');

        return view('admin.equipment.edit', compact(
            'equipment', 'specifications', 'etmGroups', 'locations'
        ));
    }

    // ============================================================
    // UPDATE — Simpan perubahan equipment
    // ============================================================
    public function update(Request $request, $id)
    {
        $equipment = DB::table('equipment')->where('id', $id)->first();

        if (!$equipment) {
            return redirect()->route('admin.equipment.index')
                ->with('error', 'Equipment tidak ditemukan.');
        }

        $request->validate([
            'equipment_code' => "required|string|max:255|unique:equipment,equipment_code,{$id}",
            'equipment_name' => 'required|string|max:255',
            'pm_number'      => 'required|string|max:255',
            'tis_number'     => 'nullable|string|max:255',
            'etm_group'      => 'required|string|max:255',
            'location'       => 'nullable|string|max:255',
            'status'         => 'required|in:active,inactive,maintenance',
            'spec_key'       => 'nullable|array',
            'spec_key.*'     => 'nullable|string|max:100',
            'spec_value'     => 'nullable|array',
            'spec_value.*'   => 'nullable|string|max:255',
        ]);

        $specifications = $this->buildSpecifications(
            $request->input('spec_key', []),
            $request->input('spec_value', [])
        );

        DB::table('equipment')->where('id', $id)->update([
            'equipment_code' => strtoupper(trim($request->equipment_code)),
            'equipment_name' => $request->equipment_name,
            'pm_number'      => $request->pm_number,
            'tis_number'     => $request->tis_number,
            'etm_group'      => $request->etm_group,
            'location'       => $request->location,
            'status'         => $request->status,
            'specifications' => $specifications ? json_encode($specifications) : null,
            'updated_at'     => now(),
        ]);

        return redirect()
            ->route('admin.equipment.show', $id)
            ->with('success', 'Data equipment berhasil diperbarui.');
    }

    // ============================================================
    // DESTROY — Hapus equipment (cek dulu ada record atau tidak)
    // ============================================================
    public function destroy($id)
    {
        $equipment = DB::table('equipment')->where('id', $id)->first();

        if (!$equipment) {
            return redirect()->route('admin.equipment.index')
                ->with('error', 'Equipment tidak ditemukan.');
        }

        $recordCount = DB::table('maintenance_records')
            ->where('equipment_id', $id)->count();

        if ($recordCount > 0) {
            return redirect()->route('admin.equipment.show', $id)
                ->with('error', "Equipment tidak dapat dihapus karena masih memiliki {$recordCount} maintenance record.");
        }

        DB::table('maintenance_schedules')->where('equipment_id', $id)->delete();
        DB::table('check_sheet_templates')->where('equipment_id', $id)->delete();
        DB::table('equipment')->where('id', $id)->delete();

        return redirect()->route('admin.equipment.index')
            ->with('success', "Equipment {$equipment->equipment_name} berhasil dihapus.");
    }

    // ============================================================
    // DOWNLOAD QR — Unduh QR Code sebagai PNG
    // ============================================================
    public function downloadQr($id)
    {
        $equipment = DB::table('equipment')->where('id', $id)->first();

        if (!$equipment) abort(404);

        $qrUrl = route('admin.records.create', ['equipment_id' => $id]);

        // Coba PNG dulu (butuh Imagick), fallback ke SVG jika tidak ada
        try {
            $qrCode   = QrCodeHelper::png($qrUrl, 400);
            $mimeType = 'image/png';
            $ext      = 'png';
        } catch (\Throwable $e) {
            $qrCode   = QrCodeHelper::svg($qrUrl, 400);
            $mimeType = 'image/svg+xml';
            $ext      = 'svg';
        }

        $filename = 'QR-' . $equipment->equipment_code . '.' . $ext;

        return response($qrCode, 200)
            ->header('Content-Type', $mimeType)
            ->header('Content-Disposition', "attachment; filename={$filename}");
    }

    // ============================================================
    // PRIVATE HELPER — Build specifications dari input dinamis
    // ============================================================
    private function buildSpecifications(array $keys, array $values): array
    {
        $specs = [];
        foreach ($keys as $i => $key) {
            $key = trim($key ?? '');
            $val = trim($values[$i] ?? '');
            if ($key !== '') {
                $specs[$key] = $val;
            }
        }
        return $specs;
    }
}