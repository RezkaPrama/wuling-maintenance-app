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
        Schema::create('maintenance_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_id')->constrained()->onDelete('cascade');
            $table->enum('pm_cycle', ['6M', '1Y', '2Y']); // 6 months, 1 year, 2 years
            $table->integer('interval_hours')->nullable(); // Hours interval
            $table->integer('interval_days')->nullable(); // Days interval
            $table->date('last_maintenance')->nullable();
            $table->date('next_maintenance');
            $table->enum('status', ['pending', 'due', 'overdue', 'completed'])->default('pending');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenance_schedules');
    }
};
