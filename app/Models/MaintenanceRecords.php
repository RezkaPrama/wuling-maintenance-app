<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $record_number
 * @property int $equipment_id
 * @property int $schedule_id
 * @property int $template_id
 * @property int $technician_id
 * @property int|null $checker_id
 * @property int|null $validator_id
 * @property \Illuminate\Support\Carbon $maintenance_date
 * @property \Illuminate\Support\Carbon $start_time
 * @property \Illuminate\Support\Carbon|null $end_time
 * @property string $status
 * @property string|null $notes
 * @property array|null $attachments
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $checker
 * @property-read \App\Models\Equipment $equipment
 * @property-read mixed $completion_percentage
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\MaintenanceRecordItems> $recordItems
 * @property-read int|null $record_items_count
 * @property-read \App\Models\MaintenanceSchedules $schedule
 * @property-read \App\Models\User $technician
 * @property-read \App\Models\CheckSheetTemplates $template
 * @property-read \App\Models\User|null $validator
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecords newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecords newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecords query()
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecords whereAttachments($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecords whereCheckerId($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecords whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecords whereEndTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecords whereEquipmentId($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecords whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecords whereMaintenanceDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecords whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecords whereRecordNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecords whereScheduleId($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecords whereStartTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecords whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecords whereTechnicianId($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecords whereTemplateId($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecords whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder|MaintenanceRecords whereValidatorId($value)
 * @mixin \Eloquent
 */
class MaintenanceRecords extends Model
{
    use HasFactory;

    protected $fillable = [
        'record_number',
        'equipment_id',
        'schedule_id',
        'template_id',
        'technician_id',
        'checker_id',
        'validator_id',
        'maintenance_date',
        'start_time',
        'end_time',
        'status',
        'notes',
        'attachments'
    ];

    protected $casts = [
        'maintenance_date' => 'date',
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
        'attachments' => 'array'
    ];

    public function equipment()
    {
        return $this->belongsTo(Equipment::class);
    }

    public function schedule()
    {
        return $this->belongsTo(MaintenanceSchedules::class, 'schedule_id');
    }

    public function template()
    {
        return $this->belongsTo(CheckSheetTemplates::class, 'template_id');
    }

    public function technician()
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function checker()
    {
        return $this->belongsTo(User::class, 'checker_id');
    }

    public function validator()
    {
        return $this->belongsTo(User::class, 'validator_id');
    }

    public function recordItems()
    {
        return $this->hasMany(MaintenanceRecordItems::class);
    }

    public function getCompletionPercentageAttribute()
    {
        $total = $this->recordItems()->count();
        if ($total === 0) return 0;
        
        $completed = $this->recordItems()
            ->whereIn('status', ['ok', 'ng', 'na'])
            ->count();
            
        return round(($completed / $total) * 100, 2);
    }

    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            $model->record_number = 'MR-' . date('Ymd') . '-' . str_pad(
                static::whereDate('created_at', today())->count() + 1, 
                4, 
                '0', 
                STR_PAD_LEFT
            );
        });
    }
}
