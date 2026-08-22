<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int|null $equipment_id
 * @property string $template_name
 * @property string $doc_number
 * @property string $pm_cycle
 * @property string|null $default_for_etm_group
 * @property array $template_data
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\CheckSheetItems> $checkSheetItems
 * @property-read int|null $check_sheet_items_count
 * @property-read \App\Models\Equipment|null $equipment
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\MaintenanceRecords> $maintenanceRecords
 * @property-read int|null $maintenance_records_count
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetTemplates newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetTemplates newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetTemplates query()
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetTemplates whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetTemplates whereDefaultForEtmGroup($value)
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetTemplates whereDocNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetTemplates whereEquipmentId($value)
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetTemplates whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetTemplates whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetTemplates wherePmCycle($value)
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetTemplates whereTemplateData($value)
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetTemplates whereTemplateName($value)
 * @method static \Illuminate\Database\Eloquent\Builder|CheckSheetTemplates whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
