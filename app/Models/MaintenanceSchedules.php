<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MaintenanceSchedules extends Model
{
    use HasFactory;

    protected $fillable = [
        'equipment_id',
        'pm_cycle',
        'interval_hours',
        'interval_days',
        'last_maintenance',
        'next_maintenance',
        'status'
    ];

    protected $casts = [
        'last_maintenance' => 'date',
        'next_maintenance' => 'date'
    ];

    public function equipment()
    {
        return $this->belongsTo(Equipment::class);
    }

    public function maintenanceRecords()
    {
        return $this->hasMany(MaintenanceRecords::class, 'schedule_id');
    }

    public function getIsOverdueAttribute()
    {
        return $this->next_maintenance < now();
    }

    public function getIsDueAttribute()
    {
        return $this->next_maintenance <= now()->addDays(7);
    }
}
