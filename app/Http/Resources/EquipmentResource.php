<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EquipmentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'equipment_code' => $this->equipment_code,
            'equipment_name' => $this->equipment_name,
            'pm_number' => $this->pm_number,
            'tis_number' => $this->tis_number,
            'etm_group' => $this->etm_group,
            'location' => $this->location,
            'status' => $this->status,
            'specifications' => $this->specifications,
            'next_maintenance' => $this->whenLoaded('nextMaintenance', function() {
                return $this->nextMaintenance ? [
                    'id' => $this->nextMaintenance->id,
                    'pm_cycle' => $this->nextMaintenance->pm_cycle,
                    'next_maintenance' => $this->nextMaintenance->next_maintenance->format('Y-m-d'),
                    'status' => $this->nextMaintenance->status,
                    'is_overdue' => $this->nextMaintenance->is_overdue,
                    'is_due' => $this->nextMaintenance->is_due,
                ] : null;
            }),
            'maintenance_schedules_count' => $this->when($this->relationLoaded('maintenanceSchedules'), 
                $this->maintenance_schedules_count ?? $this->maintenanceSchedules->count()
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
