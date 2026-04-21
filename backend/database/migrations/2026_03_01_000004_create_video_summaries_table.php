<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('video_summaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('video_id')->unique()->constrained()->cascadeOnDelete();
            $table->jsonb('key_points')->default('[]');
            $table->jsonb('chapters')->default('[]');
            $table->text('reading_mode')->nullable();
            $table->timestamps();

            $table->index('video_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('video_summaries');
    }
};
