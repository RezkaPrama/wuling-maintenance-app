<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Idempotent — cuma insert kalau kode 'M' belum ada, supaya migration
        // aman dijalankan ulang tanpa bikin duplikat.
        $exists = DB::table('pm_types')->where('code', 'M')->exists();

        if (!$exists) {
            DB::table('pm_types')->insert([
                'code'       => 'M',
                'name'       => 'Measure',
                'color_code' => '#0EA5E9', // biru cyan — belum dipakai 5 PM Type lain
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('pm_types')->where('code', 'M')->delete();
    }
};