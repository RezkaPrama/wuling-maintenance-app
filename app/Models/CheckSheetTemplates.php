<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CheckSheetTemplates extends Model
{
    use HasFactory;

    protected $fillable = [
        'equipment_id',
        'template_name',
        'doc_number',
        'pm_cycle',
        'template_data',
        'is_active'
    ];

    protected $casts = [
        'template_data' => 'array',
        'is_active' => 'boolean'
    ];

    public function equipment()
    {
        return $this->belongsTo(Equipment::class);
    }

    public function checkSheetItems()
    {
        return $this->hasMany(CheckSheetItems::class, 'template_id');
    }

    public function maintenanceRecords()
    {
        return $this->hasMany(MaintenanceRecords::class, 'template_id');
    }
}
