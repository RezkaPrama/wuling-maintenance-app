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
        Schema::create('maintenance_records', function (Blueprint $table) {
            $table->id();
            $table->string('record_number')->unique(); // Auto generated
            $table->foreignId('equipment_id')->constrained()->onDelete('cascade');
            $table->foreignId('schedule_id')->constrained('maintenance_schedules')->onDelete('cascade');
            $table->foreignId('template_id')->constrained('check_sheet_templates')->onDelete('cascade');
            $table->foreignId('technician_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('checker_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('validator_id')->nullable()->constrained('users')->onDelete('set null');
            $table->date('maintenance_date');
            $table->time('start_time');
            $table->time('end_time')->nullable();
            $table->enum('status', ['in_progress', 'completed', 'validated', 'rejected'])->default('in_progress');
            $table->text('notes')->nullable();
            $table->json('attachments')->nullable(); // Photos, documents
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenance_records');
    }
};
