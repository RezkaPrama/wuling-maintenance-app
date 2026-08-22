<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $equipment_code
 * @property string $equipment_name
 * @property string|null $machine_category
 * @property string $pm_number
 * @property string|null $tis_number
 * @property string $etm_group
 * @property string|null $location
 * @property string $status
 * @property array|null $specifications
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\CheckSheetTemplates> $checkSheetTemplates
 * @property-read int|null $check_sheet_templates_count
 * @property-read mixed $next_maintenance
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\MaintenanceRecords> $maintenanceRecords
 * @property-read int|null $maintenance_records_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\MaintenanceSchedules> $maintenanceSchedules
 * @property-read int|null $maintenance_schedules_count
 * @method static \Illuminate\Database\Eloquent\Builder|Equipment newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder|Equipment newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder|Equipment query()
 * @method static \Illuminate\Database\Eloquent\Builder|Equipment whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Equipment whereEquipmentCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Equipment whereEquipmentName($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Equipment whereEtmGroup($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Equipment whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Equipment whereLocation($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Equipment whereMachineCategory($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Equipment wherePmNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Equipment whereSpecifications($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Equipment whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Equipment whereTisNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder|Equipment whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
