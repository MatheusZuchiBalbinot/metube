<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('videos', function (Blueprint $table) {
            $table->id();
            $table->string('vuid', 26)->unique();
            $table->foreignId('channel_id')->constrained('users')->cascadeOnDelete();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->jsonb('tags')->default('[]');
            $table->string('status', 20)->default('draft');
            $table->double('duration')->nullable();
            $table->unsignedBigInteger('views')->default(0);
            $table->string('video_url', 2048)->nullable();
            $table->string('thumbnail_url', 2048)->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamps();

            $table->index('channel_id');
            $table->index('status');
            $table->index('published_at');
            $table->index(['status', 'published_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('videos');
    }
};
