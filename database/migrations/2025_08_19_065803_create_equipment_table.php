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
        Schema::create('equipment', function (Blueprint $table) {
            $table->id();
            $table->string('equipment_code')->unique(); // BD-BDC-FRB-01/50
            $table->string('equipment_name'); // Friction Roller Bed
            $table->string('pm_number'); // INA-BD-PM-022
            $table->string('tis_number')->nullable(); // INA-BD-1-0298
            $table->string('etm_group'); // Body Shop
            $table->string('location')->nullable();
            $table->enum('status', ['active', 'inactive', 'maintenance'])->default('active');
            $table->json('specifications')->nullable(); // Technical specs
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('equipment');
    }
};
