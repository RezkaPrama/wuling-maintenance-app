<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $code
 * @property string $name
 * @property string|null $description
 * @property string|null $color_code
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder|PmTypes newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder|PmTypes newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder|PmTypes query()
 * @method static \Illuminate\Database\Eloquent\Builder|PmTypes whereCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder|PmTypes whereColorCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder|PmTypes whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder|PmTypes whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder|PmTypes whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder|PmTypes whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder|PmTypes whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class PmTypes extends Model
{
    use HasFactory;
}
