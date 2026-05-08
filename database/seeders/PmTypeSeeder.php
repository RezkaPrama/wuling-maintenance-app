<?php

namespace Database\Seeders;

use App\Models\PmTypes;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class PmTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $pmTypes = [
            ['code' => 'C', 'name' => 'Check', 'description' => 'Visual inspection and checking', 'color_code' => '#28a745'],
            ['code' => 'L', 'name' => 'Lubricate', 'description' => 'Apply lubrication', 'color_code' => '#ffc107'],
            ['code' => 'Cl', 'name' => 'Cleaning', 'description' => 'Clean components', 'color_code' => '#17a2b8'],
            ['code' => 'T', 'name' => 'Tighten', 'description' => 'Tighten bolts and connections', 'color_code' => '#fd7e14'],
            ['code' => 'R', 'name' => 'Replace', 'description' => 'Replace components', 'color_code' => '#dc3545'],
        ];

        foreach ($pmTypes as $type) {
            PmTypes::create($type);
        }
    }
}
