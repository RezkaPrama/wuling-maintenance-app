<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CheckSheetTemplateController extends Controller
{
    // ============================================================
    // INDEX — Daftar semua template (JSON)
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
                'cst.default_for_etm_group',
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

        $templates = $query->paginate($perPage)->appends($request->query());

        $stats = DB::table('check_sheet_templates')
            ->selectRaw("
                COUNT(*) as total,
                SUM(is_active) as active,
                SUM(CASE WHEN pm_cycle = '6M' THEN 1 ELSE 0 END) as cycle_6m,
                SUM(CASE WHEN pm_cycle = '1Y' THEN 1 ELSE 0 END) as cycle_1y,
                SUM(CASE WHEN pm_cycle = '2Y' THEN 1 ELSE 0 END) as cycle_2y
            ")
            ->first();

        $equipmentList = DB::table('equipment')
            ->orderBy('equipment_name')
            ->get(['id', 'equipment_code', 'equipment_name']);

        return response()->json([
            'templates' => $templates,
            'stats'     => $stats,
            'filters' => [
                'search'           => $search,
                'filter_cycle'     => $filterCycle,
                'filter_equipment' => $filterEquip,
            ],
            'equipment_list' => $equipmentList,
        ]);
    }

    // ============================================================
    // FORM DATA — dropdown untuk form Create & Edit
    // (equipment aktif, master pm_types, dan daftar etm_group untuk
    // pilihan "jadikan default untuk kategori")
    // ============================================================
    public function formData()
    {
        $equipmentList = DB::table('equipment')
            ->where('status', 'active')
            ->orderBy('equipment_name')
            ->get(['id', 'equipment_code', 'equipment_name', 'etm_group']);

        $pmTypes = DB::table('pm_types')
            ->orderBy('id')
            ->get(['id', 'code', 'name', 'color_code']);

        $etmGroups = DB::table('equipment')->whereNotNull('etm_group')
            ->distinct()->orderBy('etm_group')->pluck('etm_group');

        // Info: kategori mana yang SUDAH punya template default, dan
        // template apa — supaya form bisa kasih warning "kategori ini
        // sudah dipegang template X, lanjut akan menggantikannya".
        $currentDefaults = DB::table('check_sheet_templates')
            ->whereNotNull('default_for_etm_group')
            ->where('is_active', 1)
            ->get(['id', 'template_name', 'default_for_etm_group']);

        return response()->json([
            'equipment_list'    => $equipmentList,
            'pm_types'          => $pmTypes,
            'etm_groups'        => $etmGroups,
            'current_defaults'  => $currentDefaults,
        ]);
    }

    // ============================================================
    // STORE — Simpan template baru + items
    // ============================================================
    public function store(Request $request)
    {
        $validated = $request->validate([
            'equipment_id'            => 'required|exists:equipment,id',
            'template_name'           => 'required|string|max:255',
            'doc_number'              => 'required|string|max:255|unique:check_sheet_templates,doc_number',
            'pm_cycle'                => 'required|in:6M,1Y,2Y',
            'default_for_etm_group'   => 'nullable|string|max:255',
            'items'                   => 'required|array|min:1',
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
            // Kalau template ini didaftarkan sebagai default kategori baru,
            // lucutin dulu status default dari template LAIN yang sebelumnya
            // pegang kategori itu — supaya cuma 1 template default per kategori.
            if (!empty($validated['default_for_etm_group'])) {
                DB::table('check_sheet_templates')
                    ->where('default_for_etm_group', $validated['default_for_etm_group'])
                    ->update(['default_for_etm_group' => null]);
            }

            $templateId = DB::table('check_sheet_templates')->insertGetId([
                'equipment_id'          => $validated['equipment_id'],
                'template_name'         => $validated['template_name'],
                'doc_number'            => $validated['doc_number'],
                'pm_cycle'              => $validated['pm_cycle'],
                'default_for_etm_group' => $validated['default_for_etm_group'] ?? null,
                'template_data'         => json_encode([]),
                'is_active'             => 1,
                'created_at'            => now(),
                'updated_at'            => now(),
            ]);

            $this->syncItems($templateId, $validated['items']);

            DB::commit();

            return response()->json([
                'message'     => "Template \"{$validated['template_name']}\" berhasil dibuat.",
                'template_id' => $templateId,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Gagal menyimpan template: ' . $e->getMessage(),
            ], 500);
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
            return response()->json(['message' => 'Template tidak ditemukan.'], 404);
        }

        $items = DB::table('check_sheet_items')
            ->where('template_id', $id)
            ->orderBy('item_number')
            ->get()
            ->map(function ($item) {
                $item->pm_types = json_decode($item->pm_types, true) ?? [];
                return $item;
            });

        $pmTypes = DB::table('pm_types')->orderBy('id')->get();

        $totalManPower  = $items->where('is_active', 1)->sum('man_power');
        $totalTime      = $items->where('is_active', 1)->sum('time_minutes');
        $subEquipGroups = $items->where('is_active', 1)->groupBy('sub_equipment')->count();

        $usageCount = DB::table('maintenance_records')
            ->where('template_id', $id)
            ->count();

        return response()->json([
            'template'   => $template,
            'items'      => $items,
            'pm_types'   => $pmTypes,
            'stats' => [
                'total_man_power'  => $totalManPower,
                'total_time'       => $totalTime,
                'sub_equip_groups' => $subEquipGroups,
                'usage_count'      => $usageCount,
            ],
        ]);
    }

    // ============================================================
    // UPDATE — Simpan perubahan template
    // ============================================================
    public function update(Request $request, $id)
    {
        $template = DB::table('check_sheet_templates')->where('id', $id)->first();

        if (!$template) {
            return response()->json(['message' => 'Template tidak ditemukan.'], 404);
        }

        $validated = $request->validate([
            'equipment_id'          => 'required|exists:equipment,id',
            'template_name'         => 'required|string|max:255',
            'doc_number'            => "required|string|max:255|unique:check_sheet_templates,doc_number,{$id}",
            'pm_cycle'              => 'required|in:6M,1Y,2Y',
            'default_for_etm_group' => 'nullable|string|max:255',
            'items'                 => 'required|array|min:1',
            'items.*.check_item'           => 'required|string|max:255',
            'items.*.maintenance_standard' => 'required|string',
            'items.*.pm_types'             => 'required|array|min:1',
            'items.*.man_power'            => 'required|integer|min:1|max:99',
            'items.*.time_minutes'         => 'required|integer|min:1|max:9999',
        ]);

        DB::beginTransaction();
        try {
            if (!empty($validated['default_for_etm_group'])) {
                // Lucutin dari template lain (kecuali diri sendiri)
                DB::table('check_sheet_templates')
                    ->where('default_for_etm_group', $validated['default_for_etm_group'])
                    ->where('id', '!=', $id)
                    ->update(['default_for_etm_group' => null]);
            }

            DB::table('check_sheet_templates')->where('id', $id)->update([
                'equipment_id'          => $validated['equipment_id'],
                'template_name'         => $validated['template_name'],
                'doc_number'            => $validated['doc_number'],
                'pm_cycle'              => $validated['pm_cycle'],
                'default_for_etm_group' => $validated['default_for_etm_group'] ?? null,
                'updated_at'            => now(),
            ]);

            // Hapus item lama, insert ulang (item_number tetap urut bersih)
            DB::table('check_sheet_items')->where('template_id', $id)->delete();
            $this->syncItems($id, $validated['items']);

            DB::commit();

            return response()->json([
                'message' => 'Template berhasil diperbarui.',
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Gagal memperbarui template: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============================================================
    // TOGGLE ACTIVE — Aktifkan / nonaktifkan template
    // ============================================================
    public function toggleActive($id)
    {
        $template = DB::table('check_sheet_templates')->where('id', $id)->first();

        if (!$template) {
            return response()->json(['message' => 'Template tidak ditemukan.'], 404);
        }

        $newStatus = $template->is_active ? 0 : 1;
        DB::table('check_sheet_templates')->where('id', $id)->update([
            'is_active'  => $newStatus,
            'updated_at' => now(),
        ]);

        return response()->json([
            'message'   => $newStatus ? 'Template diaktifkan.' : 'Template dinonaktifkan.',
            'is_active' => $newStatus,
        ]);
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
            return response()->json([
                'message' => "Template tidak dapat dihapus karena sudah digunakan di {$usageCount} record PM. Nonaktifkan saja jika tidak ingin dipakai lagi.",
            ], 409);
        }

        DB::table('check_sheet_templates')->where('id', $id)->delete();

        return response()->json(['message' => 'Template berhasil dihapus.']);
    }

    // ============================================================
    // PRIVATE HELPER — Sync items ke DB
    // ============================================================
    private function syncItems(int $templateId, array $items): void
    {
        $toInsert = [];
        foreach ($items as $no => $item) {
            $subEq = isset($item['sub_equipment']) ? trim($item['sub_equipment']) : null;

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
            foreach (array_chunk($toInsert, 50) as $batch) {
                DB::table('check_sheet_items')->insert($batch);
            }
        }
    }
}