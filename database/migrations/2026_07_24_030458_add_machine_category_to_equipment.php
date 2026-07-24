<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('equipment', function (Blueprint $table) {
            // Label kategori kasar buat pengelompokan di /admin/equipment
            // (beda dari equipment_name yang tetap detail/spesifik per unit,
            // misal equipment_name="Air Hoist Front Body ST#1" tapi
            // machine_category="Air Hoist Front Body" utk semua ST#1..5)
            $table->string('machine_category')->nullable()->after('equipment_name');
            $table->index('machine_category');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('equipment', function (Blueprint $table) {
            $table->dropIndex(['machine_category']);
            $table->dropColumn('machine_category');
        });
    }
};
