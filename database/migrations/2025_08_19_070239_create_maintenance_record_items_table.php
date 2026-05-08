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
        Schema::create('maintenance_record_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('maintenance_record_id')->constrained()->onDelete('cascade');
            $table->foreignId('check_item_id')->constrained('check_sheet_items')->onDelete('cascade');
            $table->enum('status', ['ok', 'ng', 'na', 'pending'])->default('pending');
            $table->text('remarks')->nullable();
            $table->json('measurements')->nullable(); // Measurement values
            $table->json('photos')->nullable(); // Item-specific photos
            $table->boolean('requires_action')->default(false);
            $table->text('action_required')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenance_record_items');
    }
};
