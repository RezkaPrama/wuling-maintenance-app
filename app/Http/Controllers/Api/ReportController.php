<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Equipment;
use App\Models\MaintenanceRecords;
use App\Models\MaintenanceSchedules;
use App\Models\User;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function maintenanceSummary(Request $request)
    {
        $dateFrom = $request->get('date_from', now()->startOfMonth());
        $dateTo = $request->get('date_to', now()->endOfMonth());

        $data = [
            'total_maintenance' => MaintenanceRecords::whereBetween('maintenance_date', [$dateFrom, $dateTo])->count(),
            'completed' => MaintenanceRecords::whereBetween('maintenance_date', [$dateFrom, $dateTo])
                ->where('status', 'completed')->count(),
            'in_progress' => MaintenanceRecords::whereBetween('maintenance_date', [$dateFrom, $dateTo])
                ->where('status', 'in_progress')->count(),
            'overdue_schedules' => MaintenanceSchedules::where('next_maintenance', '<', now())
                ->where('status', '!=', 'completed')->count(),
            'by_equipment' => Equipment::withCount([
                'maintenanceRecords' => function($query) use ($dateFrom, $dateTo) {
                    $query->whereBetween('maintenance_date', [$dateFrom, $dateTo]);
                }
            ])->get(),
            'by_technician' => User::where('role', 'technician')
                ->withCount([
                    'assignedMaintenanceRecords' => function($query) use ($dateFrom, $dateTo) {
                        $query->whereBetween('maintenance_date', [$dateFrom, $dateTo]);
                    }
                ])->get(),
        ];

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    public function equipmentStatus()
    {
        $data = [
            'active' => Equipment::where('status', 'active')->count(),
            'maintenance' => Equipment::where('status', 'maintenance')->count(),
            'inactive' => Equipment::where('status', 'inactive')->count(),
            'by_etm_group' => Equipment::selectRaw('etm_group, COUNT(*) as count, status')
                ->groupBy('etm_group', 'status')
                ->get()
                ->groupBy('etm_group'),
        ];

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    public function generateMaintenanceReport($recordId)
    {
        $record = MaintenanceRecords::with([
            'equipment',
            'technician',
            'checker',
            'validator',
            'recordItems.checkItem',
            'template'
        ])->findOrFail($recordId);

        // Calculate statistics
        $totalItems = $record->recordItems->count();
        $okItems = $record->recordItems->where('status', 'ok')->count();
        $ngItems = $record->recordItems->where('status', 'ng')->count();
        $naItems = $record->recordItems->where('status', 'na')->count();

        $reportData = [
            'record' => $record,
            'statistics' => [
                'total_items' => $totalItems,
                'ok_items' => $okItems,
                'ng_items' => $ngItems,
                'na_items' => $naItems,
                'completion_rate' => $totalItems > 0 ? round(($okItems / $totalItems) * 100, 2) : 0,
            ],
            'action_items' => $record->recordItems->where('requires_action', true),
        ];

        return response()->json([
            'success' => true,
            'data' => $reportData
        ]);
    }
}
