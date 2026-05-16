<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CheckSheetTemplates;
use App\Models\MaintenanceRecordItems;
use App\Models\MaintenanceRecords;
use Illuminate\Http\Request;

class MaintenanceRecordController extends Controller
{
    public function index(Request $request)
    {
        $query = MaintenanceRecords::with(['equipment', 'technician']);
        
        // Filter by technician
        if ($request->has('technician_id')) {
            $query->where('technician_id', $request->technician_id);
        }
        
        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        // Filter by date range
        if ($request->has('date_from')) {
            $query->whereDate('maintenance_date', '>=', $request->date_from);
        }
        
        if ($request->has('date_to')) {
            $query->whereDate('maintenance_date', '<=', $request->date_to);
        }
        
        $records = $query->latest()->paginate(10);
        
        return response()->json([
            'success' => true,
            'data' => $records
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'equipment_id' => 'required|exists:equipment,id',
            'schedule_id' => 'required|exists:maintenance_schedules,id',
            'template_id' => 'required|exists:check_sheet_templates,id',
            'maintenance_date' => 'required|date',
            'start_time' => 'required|date_format:H:i',
        ]);

        $record = MaintenanceRecords::create([
            'equipment_id' => $request->equipment_id,
            'schedule_id' => $request->schedule_id,
            'template_id' => $request->template_id,
            'technician_id' => auth()->id(),
            'maintenance_date' => $request->maintenance_date,
            'start_time' => $request->start_time,
            'status' => 'in_progress',
        ]);

        // Create record items from template
        $template = CheckSheetTemplates::with('checkSheetItems')->find($request->template_id);
        foreach ($template->checkSheetItems as $item) {
            MaintenanceRecordItems::create([
                'maintenance_record_id' => $record->id,
                'check_item_id' => $item->id,
                'status' => 'pending',
            ]);
        }

        $record->load(['equipment', 'recordItems.checkItem']);

        return response()->json([
            'success' => true,
            'message' => 'Maintenance record created successfully',
            'data' => $record
        ], 201);
    }

    public function show($id)
    {
        $record = MaintenanceRecords::with([
            'equipment',
            'schedule',
            'template',
            'technician',
            'checker',
            'validator',
            'recordItems.checkItem'
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $record
        ]);
    }

    public function updateItem(Request $request, $recordId, $itemId)
    {
        $request->validate([
            'status' => 'required|in:ok,ng,na,pending',
            'remarks' => 'nullable|string',
            'measurements' => 'nullable|array',
            'requires_action' => 'boolean',
            'action_required' => 'nullable|string',
        ]);

        $recordItem = MaintenanceRecordItems::where('maintenance_record_id', $recordId)
            ->where('id', $itemId)
            ->firstOrFail();

        $recordItem->update($request->only([
            'status', 'remarks', 'measurements', 'requires_action', 'action_required'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Record item updated successfully',
            'data' => $recordItem
        ]);
    }

    public function complete(Request $request, $id)
    {
        $record = MaintenanceRecords::findOrFail($id);
        
        // Check if all items are completed
        $pendingItems = $record->recordItems()->where('status', 'pending')->count();
        
        if ($pendingItems > 0) {
            return response()->json([
                'success' => false,
                'message' => "Cannot complete maintenance. {$pendingItems} items are still pending."
            ], 400);
        }

        $record->update([
            'end_time' => $request->end_time ?? now()->format('H:i'),
            'status' => 'completed',
            'notes' => $request->notes,
        ]);

        // Update schedule status
        $record->schedule->update([
            'status' => 'completed',
            'last_maintenance' => $record->maintenance_date,
            'next_maintenance' => $this->calculateNextMaintenance($record->schedule),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Maintenance completed successfully',
            'data' => $record
        ]);
    }

    public function uploadPhoto(Request $request, $recordId, $itemId = null)
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg|max:5120', // 5MB max
        ]);

        $file = $request->file('photo');
        $filename = time() . '_' . $file->getClientOriginalName();
        $path = $file->storeAs('maintenance_photos', $filename, 'public');

        $photoData = [
            'filename' => $filename,
            'path' => $path,
            'url' => asset('storage/' . $path),
            'uploaded_at' => now(),
        ];

        if ($itemId) {
            // Photo for specific item
            $recordItem = MaintenanceRecordItems::where('maintenance_record_id', $recordId)
                ->where('id', $itemId)
                ->firstOrFail();
            
            $photos = $recordItem->photos ?? [];
            $photos[] = $photoData;
            $recordItem->update(['photos' => $photos]);
        } else {
            // General photo for maintenance record
            $record = MaintenanceRecords::findOrFail($recordId);
            $attachments = $record->attachments ?? [];
            $attachments[] = $photoData;
            $record->update(['attachments' => $attachments]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Photo uploaded successfully',
            'data' => $photoData
        ]);
    }

    private function calculateNextMaintenance($schedule)
    {
        $lastMaintenance = $schedule->last_maintenance ?? now();
        
        switch ($schedule->pm_cycle) {
            case '6M':
                return $lastMaintenance->addMonths(6);
            case '1Y':
                return $lastMaintenance->addYear();
            case '2Y':
                return $lastMaintenance->addYears(2);
            default:
                return $lastMaintenance->addYear();
        }
    }
}
