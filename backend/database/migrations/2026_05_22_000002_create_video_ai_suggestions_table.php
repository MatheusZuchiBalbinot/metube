<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('video_ai_suggestions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('video_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('suggested_title', 255)->nullable();
            $table->text('suggested_description')->nullable();
            $table->jsonb('suggested_tags')->default('[]');
            $table->string('status', 20)->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('video_ai_suggestions');
    }
};
