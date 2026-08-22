<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MaintenanceRecordItems extends Model
{
    use HasFactory;

    protected $fillable = [
        'maintenance_record_id',
        'check_item_id',
        'status',
        'remarks',
        'measurements',
        'photos',
        'requires_action',
        'action_required'
    ];

    protected $casts = [
        'measurements' => 'array',
        'photos' => 'array',
        'requires_action' => 'boolean'
    ];

    public function maintenanceRecord()
    {
        return $this->belongsTo(MaintenanceRecords::class);
    }

    public function checkItem()
    {
        return $this->belongsTo(CheckSheetItems::class, 'check_item_id');
    }
}
