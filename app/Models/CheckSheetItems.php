<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CheckSheetItems extends Model
{
    use HasFactory;

    protected $fillable = [
        'template_id',
        'item_number',
        'sub_equipment',
        'check_item',
        'maintenance_standard',
        'pm_types',
        'man_power',
        'time_minutes',
        'is_active'
    ];

    protected $casts = [
        'pm_types' => 'array',
        'is_active' => 'boolean'
    ];

    public function template()
    {
        return $this->belongsTo(CheckSheetTemplates::class, 'template_id');
    }

    public function maintenanceRecordItems()
    {
        return $this->hasMany(MaintenanceRecordItems::class, 'check_item_id');
    }

    public function getPmTypesNamesAttribute()
    {
        $typeMap = [
            'C' => 'Check',
            'L' => 'Lubricate', 
            'Cl' => 'Cleaning',
            'T' => 'Tighten',
            'R' => 'Replace'
        ];
        
        return collect($this->pm_types)->map(function($type) use ($typeMap) {
            return $typeMap[$type] ?? $type;
        })->toArray();
    }
}
