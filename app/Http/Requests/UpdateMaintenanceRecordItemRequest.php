<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMaintenanceRecordItemRequest extends FormRequest
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
            'status' => 'required|in:ok,ng,na,pending',
            'remarks' => 'nullable|string|max:500',
            'measurements' => 'nullable|array',
            'measurements.*' => 'nullable|numeric',
            'requires_action' => 'boolean',
            'action_required' => 'required_if:requires_action,true|nullable|string|max:500',
        ];
    }

    public function messages()
    {
        return [
            'status.required' => 'Status is required',
            'status.in' => 'Status must be one of: ok, ng, na, pending',
            'action_required.required_if' => 'Action required field is mandatory when requires action is selected',
        ];
    }
}
