<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
