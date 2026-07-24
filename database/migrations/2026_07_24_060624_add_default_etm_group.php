<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('check_sheet_templates', function (Blueprint $table) {
            // Nullable — kalau diisi, artinya template ini jadi DEFAULT untuk
            // seluruh equipment yang etm_group-nya sama dengan nilai ini,
            // bukan cuma untuk equipment_id yang terikat di atas.
            // Aturan "hanya 1 template default per kategori" di-enforce di
            // level controller (Api\CheckSheetTemplateController::store/update),
            // bukan di DB, karena partial-unique-index butuh MySQL 8.0.13+
            // dan hostingan cPanel kamu belum tentu support.
            $table->string('default_for_etm_group')->nullable()->after('pm_cycle');
        });
    }

    public function down(): void
    {
        Schema::table('check_sheet_templates', function (Blueprint $table) {
            $table->dropColumn('default_for_etm_group');
        });
    }
};