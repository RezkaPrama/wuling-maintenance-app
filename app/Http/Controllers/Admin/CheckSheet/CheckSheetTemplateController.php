<?php

namespace App\Http\Controllers\Admin\CheckSheet;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CheckSheetTemplateController extends Controller
{
    // ============================================================
    // INDEX — Daftar semua template
    // ============================================================
    public function index(Request $request)
    {
        $search      = $request->input('search');
        $filterCycle = $request->input('filter_cycle');
        $filterEquip = $request->input('filter_equipment');
        $perPage     = $request->input('per_page', 25);

        $query = DB::table('check_sheet_templates as cst')
            ->join('equipment as e', 'cst.equipment_id', '=', 'e.id')
            ->select(
                'cst.id',
                'cst.template_name',
                'cst.doc_number',
                'cst.pm_cycle',
                'cst.is_active',
                'cst.created_at',
                'e.id as equipment_id',
                'e.equipment_code',
                'e.equipment_name',
                'e.etm_group',
            )
            ->selectSub(
                DB::table('check_sheet_items')
                    ->selectRaw('COUNT(*)')
                    ->whereColumn('template_id', 'cst.id')
                    ->where('is_active', 1),
                'item_count'
            );

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('cst.template_name', 'LIKE', "%{$search}%")
                  ->orWhere('cst.doc_number',   'LIKE', "%{$search}%")
                  ->orWhere('e.equipment_name',  'LIKE', "%{$search}%")
                  ->orWhere('e.equipment_code',  'LIKE', "%{$search}%");
            });
        }

        if ($filterCycle && $filterCycle !== 'all') {
            $query->where('cst.pm_cycle', $filterCycle);
        }

        if ($filterEquip) {
            $query->where('cst.equipment_id', $filterEquip);
        }

        $query->orderBy('e.equipment_name')->orderBy('cst.pm_cycle');

        $templates = $query->paginate($perPage)->appends([
            'search'           => $search,
            'filter_cycle'     => $filterCycle,
            'filter_equipment' => $filterEquip,
            'per_page'         => $perPage,
        ]);

        // Stats
        $stats = DB::table('check_sheet_templates')
            ->selectRaw("
                COUNT(*) as total,
                SUM(is_active) as active,
                SUM(CASE WHEN pm_cycle = '6M' THEN 1 ELSE 0 END) as cycle_6m,
                SUM(CASE WHEN pm_cycle = '1Y' THEN 1 ELSE 0 END) as cycle_1y,
                SUM(CASE WHEN pm_cycle = '2Y' THEN 1 ELSE 0 END) as cycle_2y
            ")
            ->first();

        // Dropdown filter equipment
        $equipmentList = DB::table('equipment')
            ->orderBy('equipment_name')
            ->get(['id', 'equipment_code', 'equipment_name']);

        return view('admin.check-sheet.template.index', compact(
            'templates', 'search', 'filterCycle', 'filterEquip',
            'stats', 'equipmentList',
        ));
    }

    // ============================================================
    // CREATE — Form template baru
    // ============================================================
    public function create()
    {
        $equipmentList = DB::table('equipment')
            ->where('status', 'active')
            ->orderBy('equipment_name')
            ->get(['id', 'equipment_code', 'equipment_name', 'etm_group']);

        $pmTypes = DB::table('pm_types')
            ->orderBy('id')
            ->get(['id', 'code', 'name', 'color_code']);

        return view('admin.check-sheet.template.create', compact(
            'equipmentList', 'pmTypes',
        ));
    }

    // ============================================================
    // STORE — Simpan template baru + items
    // ============================================================
    public function store(Request $request)
    {
        $request->validate([
            'equipment_id'  => 'required|exists:equipment,id',
            'template_name' => 'required|string|max:255',
            'doc_number'    => 'required|string|max:255|unique:check_sheet_templates,doc_number',
            'pm_cycle'      => 'required|in:6M,1Y,2Y',
            'items'         => 'required|array|min:1',
            'items.*.check_item'           => 'required|string|max:255',
            'items.*.maintenance_standard' => 'required|string',
            'items.*.pm_types'             => 'required|array|min:1',
            'items.*.man_power'            => 'required|integer|min:1|max:99',
            'items.*.time_minutes'         => 'required|integer|min:1|max:9999',
        ], [
            'items.*.check_item.required'           => 'Check Item baris :position wajib diisi.',
            'items.*.maintenance_standard.required' => 'Maintenance Standard baris :position wajib diisi.',
            'items.*.pm_types.required'             => 'PM Type baris :position wajib dipilih minimal 1.',
            'items.*.man_power.required'            => 'Man Power baris :position wajib diisi.',
            'items.*.time_minutes.required'         => 'Time baris :position wajib diisi.',
        ]);

        DB::beginTransaction();
        try {
            // Simpan template header
            $templateId = DB::table('check_sheet_templates')->insertGetId([
                'equipment_id'  => $request->equipment_id,
                'template_name' => $request->template_name,
                'doc_number'    => $request->doc_number,
                'pm_cycle'      => $request->pm_cycle,
                'template_data' => json_encode([]),  // reserved
                'is_active'     => 1,
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);

            // Simpan items
            $this->syncItems($templateId, $request->items);

            DB::commit();

            return redirect()
                ->route('admin.check-sheet.template.show', $templateId)
                ->with('success', "Template \"{$request->template_name}\" berhasil dibuat.");

        } catch (\Exception $e) {
            DB::rollBack();
            return back()
                ->with('error', 'Gagal menyimpan template: ' . $e->getMessage())
                ->withInput();
        }
    }

    // ============================================================
    // SHOW — Detail template + list items
    // ============================================================
    public function show($id)
    {
        $template = DB::table('check_sheet_templates as cst')
            ->join('equipment as e', 'cst.equipment_id', '=', 'e.id')
            ->select('cst.*', 'e.equipment_code', 'e.equipment_name', 'e.etm_group', 'e.location')
            ->where('cst.id', $id)
            ->first();

        if (!$template) {
            return redirect()->route('admin.check-sheet.template.index')
                ->with('error', 'Template tidak ditemukan.');
        }

        $items = DB::table('check_sheet_items')
            ->where('template_id', $id)
            ->orderBy('item_number')
            ->get()
            ->map(function ($item) {
                $item->pm_types = json_decode($item->pm_types, true) ?? [];
                return $item;
            });

        // PM Types master (untuk referensi warna/label)
        $pmTypes = DB::table('pm_types')->orderBy('id')->get();

        // Stat ringkasan
        $totalManPower   = $items->where('is_active', 1)->sum('man_power');
        $totalTime       = $items->where('is_active', 1)->sum('time_minutes');
        $subEquipGroups  = $items->where('is_active', 1)->groupBy('sub_equipment')->count();

        // Cek berapa record yg pakai template ini
        $usageCount = DB::table('maintenance_records')
            ->where('template_id', $id)
            ->count();

        return view('admin.check-sheet.template.show', compact(
            'template', 'items', 'pmTypes',
            'totalManPower', 'totalTime', 'subEquipGroups', 'usageCount',
        ));
    }

    // ============================================================
    // EDIT — Form edit template
    // ============================================================
    public function edit($id)
    {
        $template = DB::table('check_sheet_templates')->where('id', $id)->first();

        if (!$template) {
            return redirect()->route('admin.check-sheet.template.index')
                ->with('error', 'Template tidak ditemukan.');
        }

        $items = DB::table('check_sheet_items')
            ->where('template_id', $id)
            ->where('is_active', 1)
            ->orderBy('item_number')
            ->get()
            ->map(function ($item) {
                $item->pm_types = json_decode($item->pm_types, true) ?? [];
                return $item;
            });

        $equipmentList = DB::table('equipment')
            ->orderBy('equipment_name')
            ->get(['id', 'equipment_code', 'equipment_name', 'etm_group']);

        $pmTypes = DB::table('pm_types')->orderBy('id')->get(['id', 'code', 'name', 'color_code']);

        return view('admin.check-sheet.template.edit', compact(
            'template', 'items', 'equipmentList', 'pmTypes',
        ));
    }

    // ============================================================
    // UPDATE — Simpan perubahan template
    // ============================================================
    public function update(Request $request, $id)
    {
        $template = DB::table('check_sheet_templates')->where('id', $id)->first();

        if (!$template) {
            return redirect()->route('admin.check-sheet.template.index')
                ->with('error', 'Template tidak ditemukan.');
        }

        $request->validate([
            'equipment_id'  => 'required|exists:equipment,id',
            'template_name' => 'required|string|max:255',
            'doc_number'    => "required|string|max:255|unique:check_sheet_templates,doc_number,{$id}",
            'pm_cycle'      => 'required|in:6M,1Y,2Y',
            'items'         => 'required|array|min:1',
            'items.*.check_item'           => 'required|string|max:255',
            'items.*.maintenance_standard' => 'required|string',
            'items.*.pm_types'             => 'required|array|min:1',
            'items.*.man_power'            => 'required|integer|min:1|max:99',
            'items.*.time_minutes'         => 'required|integer|min:1|max:9999',
        ]);

        DB::beginTransaction();
        try {
            // Update header
            DB::table('check_sheet_templates')->where('id', $id)->update([
                'equipment_id'  => $request->equipment_id,
                'template_name' => $request->template_name,
                'doc_number'    => $request->doc_number,
                'pm_cycle'      => $request->pm_cycle,
                'updated_at'    => now(),
            ]);

            // Soft-delete semua item lama, lalu insert ulang
            // (pakai delete + insert agar item_number tetap urut bersih)
            DB::table('check_sheet_items')->where('template_id', $id)->delete();
            $this->syncItems($id, $request->items);

            DB::commit();

            return redirect()
                ->route('admin.check-sheet.template.show', $id)
                ->with('success', 'Template berhasil diperbarui.');

        } catch (\Exception $e) {
            DB::rollBack();
            return back()
                ->with('error', 'Gagal memperbarui template: ' . $e->getMessage())
                ->withInput();
        }
    }

    // ============================================================
    // TOGGLE ACTIVE — Aktifkan / nonaktifkan template
    // ============================================================
    public function toggleActive($id)
    {
        $template = DB::table('check_sheet_templates')->where('id', $id)->first();

        if (!$template) {
            return back()->with('error', 'Template tidak ditemukan.');
        }

        $newStatus = $template->is_active ? 0 : 1;
        DB::table('check_sheet_templates')->where('id', $id)->update([
            'is_active'  => $newStatus,
            'updated_at' => now(),
        ]);

        $msg = $newStatus ? 'Template diaktifkan.' : 'Template dinonaktifkan.';
        return back()->with('success', $msg);
    }

    // ============================================================
    // DESTROY — Hapus template (hanya jika belum dipakai)
    // ============================================================
    public function destroy($id)
    {
        $usageCount = DB::table('maintenance_records')
            ->where('template_id', $id)
            ->count();

        if ($usageCount > 0) {
            return back()->with('error',
                "Template tidak dapat dihapus karena sudah digunakan di {$usageCount} record PM. " .
                "Nonaktifkan saja jika tidak ingin dipakai lagi."
            );
        }

        DB::table('check_sheet_templates')->where('id', $id)->delete();

        return redirect()->route('admin.check-sheet.template.index')
            ->with('success', 'Template berhasil dihapus.');
    }

    // ============================================================
    // PRIVATE HELPER — Sync items ke DB
    // ============================================================
    private function syncItems(int $templateId, array $items): void
    {
        $toInsert = [];
        foreach ($items as $no => $item) {
            // Kelompok sub_equipment: bisa string kosong
            $subEq = isset($item['sub_equipment'])
                ? trim($item['sub_equipment'])
                : null;

            $toInsert[] = [
                'template_id'          => $templateId,
                'item_number'          => $no + 1,
                'sub_equipment'        => $subEq ?: null,
                'check_item'           => trim($item['check_item']),
                'maintenance_standard' => trim($item['maintenance_standard']),
                'pm_types'             => json_encode(array_values($item['pm_types'])),
                'man_power'            => (int) $item['man_power'],
                'time_minutes'         => (int) $item['time_minutes'],
                'is_active'            => 1,
                'created_at'           => now(),
                'updated_at'           => now(),
            ];
        }

        if (!empty($toInsert)) {
            // Insert per batch untuk hindari query terlalu besar
            foreach (array_chunk($toInsert, 50) as $batch) {
                DB::table('check_sheet_items')->insert($batch);
            }
        }
    }
}
