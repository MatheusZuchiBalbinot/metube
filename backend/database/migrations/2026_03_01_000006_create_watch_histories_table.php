<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('watch_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('video_id')->constrained()->cascadeOnDelete();
            $table->timestamp('watched_at')->useCurrent();

            $table->index(['user_id', 'watched_at']);
            $table->index('video_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('watch_histories');
    }
};
