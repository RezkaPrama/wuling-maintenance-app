<?php

namespace Database\Seeders;

use App\Models\CheckSheetItems;
use App\Models\CheckSheetTemplates;
use App\Models\Equipment;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CheckSheetTemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Equipment 1 - Friction Roller Bed
        $equipment1 = Equipment::where('equipment_code', 'BD-BDC-FRB-01/50')->first();
        
        // 6 Month Template
        $template6M = CheckSheetTemplates::create([
            'equipment_id' => $equipment1->id,
            'template_name' => 'Friction Roller Bed - 6M Maintenance',
            'doc_number' => 'Form 05.05-05(0A)',
            'pm_cycle' => '6M',
            'template_data' => [
                'prepared_by' => 'Koko Kurniawan',
                'year' => 2025,
                'pm_status' => 'OFF'
            ],
            'is_active' => true,
        ]);

        // Check Sheet Items for 6M
        $items6M = [
            [
                'item_number' => 1,
                'sub_equipment' => 'Drive Unit FRB',
                'check_item' => 'Cek baut drive motor, bersihkan fan motor dan pastikan snapping terkunci dengan benar',
                'maintenance_standard' => 'Baut penahah motor kencang sesuai posisi working, fan motor bersih dan snapping fan terpasang dengan benar.',
                'pm_types' => ['C'],
                'man_power' => 2,
                'time_minutes' => 20,
            ],
            [
                'item_number' => 2,
                'sub_equipment' => 'Drive Unit FRB',
                'check_item' => 'Ukur karak spring balancing',
                'maintenance_standard' => 'Jarak spring balancing 42±5 mm',
                'pm_types' => ['C'],
                'man_power' => 1,
                'time_minutes' => 2,
            ],
            [
                'item_number' => 3,
                'sub_equipment' => null,
                'check_item' => 'Cek kekencangan baut mechanical lock dengan torsi',
                'maintenance_standard' => 'Standar kekencangan baut mechanical lock 16 Nm.',
                'pm_types' => ['T'],
                'man_power' => 1,
                'time_minutes' => 5,
            ],
            [
                'item_number' => 4,
                'sub_equipment' => 'Table Friction',
                'check_item' => 'Cek baut penahah roll dan cek kondisi permukaan roll',
                'maintenance_standard' => 'Baut penahah table friction kencang sesuai posisi working, tidak ada retakan di jalur area welding',
                'pm_types' => ['C'],
                'man_power' => 1,
                'time_minutes' => 2,
            ],
            [
                'item_number' => 5,
                'sub_equipment' => null,
                'check_item' => 'Cek wiring posisi connection Junction terminal T1 type',
                'maintenance_standard' => 'T1 connection kencang dan tidak ada konektor dan label yang lepas.',
                'pm_types' => ['C'],
                'man_power' => 2,
                'time_minutes' => 5,
            ],
            [
                'item_number' => 6,
                'sub_equipment' => 'Interlock Sensor',
                'check_item' => 'Cek nut penguruci proximity switch dan bersihkan permukaan sensor',
                'maintenance_standard' => 'Pemasukan proximity bersih, nut pengunci kencang, baut bracket sensor kencang sesuai posisi working, socket kabel sensor kencang dan terdapat label pada kabel. LED pada proximity menyala saat mendeteksi benda.',
                'pm_types' => ['C', 'Cl'],
                'man_power' => 2,
                'time_minutes' => 10,
            ],
        ];

        foreach ($items6M as $item) {
            CheckSheetItems::create(array_merge($item, ['template_id' => $template6M->id]));
        }

        // 1 Year Template
        $template1Y = CheckSheetTemplates::create([
            'equipment_id' => $equipment1->id,
            'template_name' => 'Friction Roller Bed - 1Y Maintenance',
            'doc_number' => 'Form 05.05-05(0A)',
            'pm_cycle' => '1Y',
            'template_data' => [
                'prepared_by' => 'Koko Kurniawan',
                'year' => 2025,
                'pm_status' => 'OFF'
            ],
            'is_active' => true,
        ]);

        // Check Sheet Items for 1Y (includes all 6M items plus additional)
        $items1Y = array_merge($items6M, [
            [
                'item_number' => 7,
                'sub_equipment' => 'Drive Unit FRB',
                'check_item' => 'Ukur ketebalan disk brake motor',
                'maintenance_standard' => 'Brake tidak rusak / scratch dan jarak antara brake ring dengan brake clutch 0,25 ÷ 0,6 mm dan minimum ketebalan disc brake 9 mm.',
                'pm_types' => ['C', 'T'],
                'man_power' => 2,
                'time_minutes' => 60,
            ],
        ]);

        foreach ($items1Y as $item) {
            CheckSheetItems::create(array_merge($item, ['template_id' => $template1Y->id]));
        }
    }
}
