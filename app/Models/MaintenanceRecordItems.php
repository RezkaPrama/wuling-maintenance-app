<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $maintenance_record_id
 * @property int $check_item_id
 * @property string $status
 * @property string|null $remarks
 * @property array|null $measurements
 * @property int|null $actual_man_power Aktual jumlah teknisi yang mengerjakan item ini
 * @property int|null $actual_time_minutes Aktual waktu pengerjaan item ini dalam menit
 * @property array|null $photos
 * @property bool $requires_action
 * @property string|null $action_required
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\CheckSheetItems $checkItem
 * @property-read \App\Models\MaintenanceRecords $maintenanceRecord
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecordItems newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecordItems newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecordItems query()
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecordItems whereActionRequired($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecordItems whereActualManPower($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecordItems whereActualTimeMinutes($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecordItems whereCheckItemId($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecordItems whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecordItems whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecordItems whereMaintenanceRecordId($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecordItems whereMeasurements($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecordItems wherePhotos($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecordItems whereRemarks($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecordItems whereRequiresAction($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecordItems whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecordItems whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
