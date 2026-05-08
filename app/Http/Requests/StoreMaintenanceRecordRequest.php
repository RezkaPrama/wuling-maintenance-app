<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMaintenanceRecordRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // return false;
        return $this->user()->canPerformMaintenance();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'equipment_id' => 'required|exists:equipment,id',
            'schedule_id' => 'required|exists:maintenance_schedules,id',
            'template_id' => 'required|exists:check_sheet_templates,id',
            'maintenance_date' => 'required|date|after_or_equal:today',
            'start_time' => 'required|date_format:H:i',
            'notes' => 'nullable|string|max:1000',
        ];
    }

    public function messages()
    {
        return [
            'equipment_id.required' => 'Equipment is required',
            'equipment_id.exists' => 'Selected equipment does not exist',
            'schedule_id.required' => 'Maintenance schedule is required',
            'schedule_id.exists' => 'Selected maintenance schedule does not exist',
            'template_id.required' => 'Check sheet template is required',
            'template_id.exists' => 'Selected check sheet template does not exist',
            'maintenance_date.required' => 'Maintenance date is required',
            'maintenance_date.after_or_equal' => 'Maintenance date cannot be in the past',
            'start_time.required' => 'Start time is required',
            'start_time.date_format' => 'Start time must be in HH:MM format',
        ];
    }
}
