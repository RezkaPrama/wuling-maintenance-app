<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $equipment_id
 * @property string $pm_cycle
 * @property int|null $interval_hours
 * @property int|null $interval_days
 * @property \Illuminate\Support\Carbon|null $last_maintenance
 * @property \Illuminate\Support\Carbon $next_maintenance
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Equipment $equipment
 * @property-read mixed $is_due
 * @property-read mixed $is_overdue
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\MaintenanceRecords> $maintenanceRecords
 * @property-read int|null $maintenance_records_count
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceSchedules newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceSchedules newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceSchedules query()
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceSchedules whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceSchedules whereEquipmentId($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceSchedules whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceSchedules whereIntervalDays($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceSchedules whereIntervalHours($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceSchedules whereLastMaintenance($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceSchedules whereNextMaintenance($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceSchedules wherePmCycle($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceSchedules whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceSchedules whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
