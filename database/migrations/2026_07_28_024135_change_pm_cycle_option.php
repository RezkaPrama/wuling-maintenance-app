<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
     public function up(): void
    {
        // Sama seperti perubahan di check_sheet_templates — fallback dulu
        // data lama '2Y' ke '1Y' sebelum constraint enum berubah, supaya
        // tidak ada row yang jadi invalid.
        DB::table('maintenance_schedules')
            ->where('pm_cycle', '2Y')
            ->update(['pm_cycle' => '1Y']);

        DB::statement("ALTER TABLE maintenance_schedules MODIFY pm_cycle ENUM('1M','3M','6M','1Y') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE maintenance_schedules MODIFY pm_cycle ENUM('6M','1Y','2Y') NOT NULL");
    }
};
