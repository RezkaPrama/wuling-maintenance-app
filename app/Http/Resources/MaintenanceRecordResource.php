<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MaintenanceRecordResource extends JsonResource
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
            'record_number' => $this->record_number,
            'equipment' => new EquipmentResource($this->whenLoaded('equipment')),
            'technician' => $this->whenLoaded('technician', [
                'id' => $this->technician->id,
                'name' => $this->technician->name,
                'employee_id' => $this->technician->employee_id,
            ]),
            'checker' => $this->whenLoaded('checker', function() {
                return $this->checker ? [
                    'id' => $this->checker->id,
                    'name' => $this->checker->name,
                    'employee_id' => $this->checker->employee_id,
                ] : null;
            }),
            'validator' => $this->whenLoaded('validator', function() {
                return $this->validator ? [
                    'id' => $this->validator->id,
                    'name' => $this->validator->name,
                    'employee_id' => $this->validator->employee_id,
                ] : null;
            }),
            'maintenance_date' => $this->maintenance_date->format('Y-m-d'),
            'start_time' => $this->start_time ? $this->start_time->format('H:i') : null,
            'end_time' => $this->end_time ? $this->end_time->format('H:i') : null,
            'status' => $this->status,
            'completion_percentage' => $this->completion_percentage,
            'notes' => $this->notes,
            'attachments' => $this->attachments,
            'record_items' => MaintenanceRecordItemResource::collection($this->whenLoaded('recordItems')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
