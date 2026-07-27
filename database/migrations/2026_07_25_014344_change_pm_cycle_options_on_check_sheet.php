<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Kalau ada row lama pakai cycle '2Y' (dihapus dari pilihan baru),
        // fallback dulu ke '1Y' SEBELUM ubah enum — supaya tidak ada data
        // yang mendadak jadi invalid/kosong pas constraint enum berubah.
        DB::table('check_sheet_templates')
            ->where('pm_cycle', '2Y')
            ->update(['pm_cycle' => '1Y']);

        DB::statement("ALTER TABLE check_sheet_templates MODIFY pm_cycle ENUM('1M','3M','6M','1Y') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE check_sheet_templates MODIFY pm_cycle ENUM('6M','1Y','2Y') NOT NULL");
    }
};