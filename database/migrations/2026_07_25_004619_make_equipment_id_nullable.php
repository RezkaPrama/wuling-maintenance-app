<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('check_sheet_templates', function (Blueprint $table) {
            // FIX: equipment_id sekarang OPSIONAL. Template check sheet
            // sekarang dikategorikan lewat `default_for_etm_group` yang
            // isinya nilai dari equipment.machine_category — jadi 1 template
            // otomatis berlaku untuk SEMUA equipment dengan machine_category
            // yang sama, tanpa perlu pilih equipment satu-satu.
            //
            // Butuh doctrine/dbal (sudah ada di composer.json project ini)
            // supaya ->change() bisa dipakai untuk ubah nullable constraint.
            $table->unsignedBigInteger('equipment_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('check_sheet_templates', function (Blueprint $table) {
            $table->unsignedBigInteger('equipment_id')->nullable(false)->change();
        });
    }
};