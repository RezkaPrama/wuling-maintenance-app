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
        Schema::create('check_sheet_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_id')->constrained()->onDelete('cascade');
            $table->string('template_name');
            $table->string('doc_number'); // Doc No.: Form 05.05-05(0A)
            $table->enum('pm_cycle', ['6M', '1Y', '2Y']);
            $table->json('template_data'); // JSON structure of check items
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('check_sheet_templates');
    }
};
