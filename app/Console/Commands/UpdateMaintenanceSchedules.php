<?php

namespace App\Console\Commands;

use App\Models\MaintenanceSchedules;
use Illuminate\Console\Command;

class UpdateMaintenanceSchedules extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    // protected $signature = 'app:update-maintenance-schedules';

    /**
     * The console command description.
     *
     * @var string
     */
    // protected $description = 'Command description';

    protected $signature = 'maintenance:update-schedules';
    protected $description = 'Update maintenance schedule statuses based on due dates';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Updating maintenance schedule statuses...');

        // Update overdue schedules
        $overdueCount = MaintenanceSchedules::where('next_maintenance', '<', now())
            ->where('status', '!=', 'completed')
            ->update(['status' => 'overdue']);

        // Update due schedules (within next 7 days)
        $dueCount = MaintenanceSchedules::whereBetween('next_maintenance', [now(), now()->addDays(7)])
            ->where('status', 'pending')
            ->update(['status' => 'due']);

        $this->info("Updated {$overdueCount} overdue schedules");
        $this->info("Updated {$dueCount} due schedules");
        $this->info('Schedule update completed!');

        return 0;
    }
}
