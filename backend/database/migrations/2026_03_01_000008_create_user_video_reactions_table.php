<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_reactions', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('video_id')->constrained()->cascadeOnDelete();
            $table->string('type', 10);

            $table->primary(['user_id', 'video_id']);
            $table->index(['user_id', 'type']);
            $table->index('video_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_reactions');
    }
};
