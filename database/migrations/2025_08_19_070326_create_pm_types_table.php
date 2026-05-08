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
        Schema::create('pm_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10); // C, L, Cl, T, R
            $table->string('name'); // Check, Lubricate, Cleaning, Tighten, Replace
            $table->string('description')->nullable();
            $table->string('color_code', 7)->nullable(); // For UI display
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pm_types');
    }
};
