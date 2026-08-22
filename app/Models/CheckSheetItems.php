<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $template_id
 * @property int $item_number
 * @property string|null $sub_equipment
 * @property string $check_item
 * @property string $maintenance_standard
 * @property array $pm_types
 * @property int $man_power
 * @property int $time_minutes
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read mixed $pm_types_names
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\MaintenanceRecordItems> $maintenanceRecordItems
 * @property-read int|null $maintenance_record_items_count
 * @property-read \App\Models\CheckSheetTemplates $template
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetItems newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetItems newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetItems query()
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetItems whereCheckItem($value)
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetItems whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetItems whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetItems whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetItems whereItemNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetItems whereMaintenanceStandard($value)
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetItems whereManPower($value)
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetItems wherePmTypes($value)
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetItems whereSubEquipment($value)
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetItems whereTemplateId($value)
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetItems whereTimeMinutes($value)
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetItems whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
