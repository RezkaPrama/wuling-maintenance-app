<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MaintenanceRecordItemResource extends JsonResource
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
            'check_item' => $this->whenLoaded('checkItem', [
                'id' => $this->checkItem->id,
                'item_number' => $this->checkItem->item_number,
                'sub_equipment' => $this->checkItem->sub_equipment,
                'check_item' => $this->checkItem->check_item,
                'maintenance_standard' => $this->checkItem->maintenance_standard,
                'pm_types' => $this->checkItem->pm_types,
                'pm_types_names' => $this->checkItem->pm_types_names,
                'man_power' => $this->checkItem->man_power,
                'time_minutes' => $this->checkItem->time_minutes,
            ]),
            'status' => $this->status,
            'remarks' => $this->remarks,
            'measurements' => $this->measurements,
            'photos' => $this->photos,
            'requires_action' => $this->requires_action,
            'action_required' => $this->action_required,
            'updated_at' => $this->updated_at,
        ];
    }
}
