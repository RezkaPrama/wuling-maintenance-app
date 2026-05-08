<?php

namespace Database\Seeders;

use App\Models\Equipment;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class EquipmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Equipment::create([
            'equipment_code' => 'BD-BDC-FRB-01/50',
            'equipment_name' => 'Friction Roller Bed',
            'pm_number' => 'INA-BD-PM-022',
            'tis_number' => 'INA-BD-1-0298',
            'etm_group' => 'Body Shop',
            'location' => 'Production Line A',
            'status' => 'active',
            'specifications' => [
                'model' => 'FRB-2025',
                'capacity' => '2000kg',
                'voltage' => '380V',
                'power' => '15kW'
            ]
        ]);

        Equipment::create([
            'equipment_code' => 'BD-BDC-TF-02/50',
            'equipment_name' => 'Table Friction Unit',
            'pm_number' => 'INA-BD-PM-023',
            'tis_number' => 'INA-BD-1-0299',
            'etm_group' => 'Body Shop',
            'location' => 'Production Line A',
            'status' => 'active',
            'specifications' => [
                'model' => 'TF-2025',
                'capacity' => '1500kg',
                'voltage' => '380V',
                'power' => '10kW'
            ]
        ]);
    }
}
