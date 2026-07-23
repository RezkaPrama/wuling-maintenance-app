<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Equipment;
use App\Models\MaintenanceRecords;
use Illuminate\Http\Request;

class EquipmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Equipment::with(['maintenanceSchedules', 'nextMaintenance']);
        
        // Filter by ETM Group
        if ($request->has('etm_group')) {
            $query->where('etm_group', $request->etm_group);
        }
        
        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('equipment_name', 'like', "%{$search}%")
                  ->orWhere('equipment_code', 'like', "%{$search}%")
                  ->orWhere('pm_number', 'like', "%{$search}%");
            });
        }
        
        $equipment = $query->paginate(10);
        
        return response()->json([
            'success' => true,
            'data' => $equipment
        ]);
    }

    public function show($id)
    {
        $equipment = Equipment::with([
            'maintenanceSchedules',
            'checkSheetTemplates.checkSheetItems',
            'maintenanceRecords' => function($query) {
                $query->latest()->limit(5);
            }
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $equipment
        ]);
    }

    public function getMaintenanceHistory($id)
    {
        $equipment = Equipment::findOrFail($id);
        
        $history = MaintenanceRecords::where('equipment_id', $id)
            ->with(['technician', 'checker', 'validator'])
            ->orderBy('maintenance_date', 'desc')
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => [
                'equipment' => $equipment,
                'history' => $history
            ]
        ]);
    }
}
