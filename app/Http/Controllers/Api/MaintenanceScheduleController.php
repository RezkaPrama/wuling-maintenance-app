<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaintenanceRecords;
use App\Models\MaintenanceSchedules;
use Illuminate\Http\Request;

class MaintenanceScheduleController extends Controller
{
    public function index(Request $request)
    {
        $query = MaintenanceSchedules::with('equipment');
        
        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        // Filter by due date
        if ($request->has('due_filter')) {
            switch ($request->due_filter) {
                case 'overdue':
                    $query->where('next_maintenance', '<', now());
                    break;
                case 'due_soon':
                    $query->whereBetween('next_maintenance', [now(), now()->addDays(7)]);
                    break;
                case 'this_month':
                    $query->whereBetween('next_maintenance', [now()->startOfMonth(), now()->endOfMonth()]);
                    break;
            }
        }
        
        $schedules = $query->orderBy('next_maintenance', 'asc')->paginate(10);
        
        return response()->json([
            'success' => true,
            'data' => $schedules
        ]);
    }

    public function show($id)
    {
        $schedule = MaintenanceSchedules::with([
            'equipment.checkSheetTemplates' => function($query) {
                $query->where('is_active', true);
            }
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $schedule
        ]);
    }

    public function getDashboardSummary()
    {
        $summary = [
            'overdue' => MaintenanceSchedules::where('next_maintenance', '<', now())
                ->where('status', '!=', 'completed')->count(),
            'due_today' => MaintenanceSchedules::whereDate('next_maintenance', today())
                ->where('status', '!=', 'completed')->count(),
            'due_this_week' => MaintenanceSchedules::whereBetween('next_maintenance', [
                now(), now()->addDays(7)
            ])->where('status', '!=', 'completed')->count(),
            'in_progress' => MaintenanceRecords::where('status', 'in_progress')->count(),
            'completed_today' => MaintenanceRecords::whereDate('created_at', today())
                ->where('status', 'completed')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $summary
        ]);
    }
}
