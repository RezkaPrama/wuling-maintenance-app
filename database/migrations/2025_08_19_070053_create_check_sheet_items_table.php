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
        Schema::create('check_sheet_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained('check_sheet_templates')->onDelete('cascade');
            $table->integer('item_number');
            $table->string('sub_equipment')->nullable(); // Drive Unit FRB, Table Friction, etc
            $table->string('check_item'); // Check item description
            $table->text('maintenance_standard'); // Maintenance standard description
            $table->json('pm_types'); // ['Check', 'Lubricate', 'Cleaning', 'Tighten', 'Replace']
            $table->integer('man_power')->default(1); // Number of people required
            $table->integer('time_minutes'); // Time required in minutes
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('check_sheet_items');
    }
};
