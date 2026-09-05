<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration
{
    public function up(): void
    {
        Schema::create('comments', function (Blueprint $table): void {
            $table->id();
            $table->string('cuid', 11)->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('video_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('comments')->cascadeOnDelete();
            $table->text('content');
            $table->unsignedInteger('likes_count')->default(0);
            $table->unsignedInteger('replies_count')->default(0);
            $table->timestamps();

            $table->index('video_id');
            $table->index('parent_id');
            $table->index('user_id');
        });

        // Top-level comments per video, ordered by recency (most common feed).
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('
                CREATE INDEX comments_video_top_level_idx
                ON comments (video_id, created_at DESC)
                WHERE parent_id IS NULL
            ');
        } else {
            Schema::table('comments', function (Blueprint $table): void {
                $table->index(['video_id', 'parent_id', 'created_at'], 'comments_video_top_level_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};
