<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CheckSheetTemplates;
use Illuminate\Http\Request;

class CheckSheetController extends Controller
{
    public function getTemplate($equipmentId, $pmCycle = null)
    {
        $query = CheckSheetTemplates::with('checkSheetItems')
            ->where('equipment_id', $equipmentId)
            ->where('is_active', true);
        
        if ($pmCycle) {
            $query->where('pm_cycle', $pmCycle);
        }
        
        $template = $query->first();
        
        if (!$template) {
            return response()->json([
                'success' => false,
                'message' => 'Check sheet template not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $template
        ]);
    }
}
