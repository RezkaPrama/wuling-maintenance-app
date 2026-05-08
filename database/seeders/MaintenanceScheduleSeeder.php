<?php

namespace Database\Seeders;

use App\Models\Equipment;
use App\Models\MaintenanceSchedules;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class MaintenanceScheduleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $equipment = Equipment::all();

        foreach ($equipment as $eq) {
            // Create 6M schedule
            MaintenanceSchedules::create([
                'equipment_id' => $eq->id,
                'pm_cycle' => '6M',
                'interval_days' => 180,
                'last_maintenance' => now()->subMonths(5),
                'next_maintenance' => now()->addMonth(),
                'status' => 'pending',
            ]);

            // Create 1Y schedule
            MaintenanceSchedules::create([
                'equipment_id' => $eq->id,
                'pm_cycle' => '1Y',
                'interval_days' => 365,
                'last_maintenance' => now()->subMonths(10),
                'next_maintenance' => now()->addMonths(2),
                'status' => 'pending',
            ]);

            // Create overdue schedule for testing
            MaintenanceSchedules::create([
                'equipment_id' => $eq->id,
                'pm_cycle' => '6M',
                'interval_days' => 180,
                'last_maintenance' => now()->subMonths(8),
                'next_maintenance' => now()->subDays(10),
                'status' => 'overdue',
            ]);
        }
    }
}
