<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Equipment extends Model
{
    use HasFactory;

    protected $fillable = [
        'equipment_code',
        'equipment_name',
        'pm_number',
        'tis_number',
        'etm_group',
        'location',
        'status',
        'specifications'
    ];

    protected $casts = [
        'specifications' => 'array'
    ];

    public function maintenanceSchedules()
    {
        return $this->hasMany(MaintenanceSchedules::class);
    }

    public function checkSheetTemplates()
    {
        return $this->hasMany(CheckSheetTemplates::class);
    }

    public function maintenanceRecords()
    {
        return $this->hasMany(MaintenanceRecords::class);
    }

    public function getNextMaintenanceAttribute()
    {
        return $this->maintenanceSchedules()
            ->where('status', '!=', 'completed')
            ->orderBy('next_maintenance', 'asc')
            ->first();
    }
}
