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
            $table->string('video_url', 500)->nullable();
            $table->string('thumbnail_url', 500)->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamps();

            $table->index('channel_id');
            $table->index('status');
            $table->index('published_at');
            $table->index(['status', 'published_at']);
            // Channel pages: status filter + recency sort.
            $table->index(['channel_id', 'status', 'published_at'], 'videos_channel_status_pub_idx');
            // Recommendations/related/popular order by views with only a status filter.
            $table->index(['status', 'views'], 'videos_status_views_idx');
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("
                ALTER TABLE videos
                ADD COLUMN search_tsv tsvector
                    GENERATED ALWAYS AS (
                        setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
                        setweight(to_tsvector('simple', coalesce(description, '')), 'B')
                    ) STORED
            ");

            DB::statement('CREATE INDEX videos_search_tsv_gin ON videos USING GIN (search_tsv)');
            DB::statement('CREATE INDEX videos_tags_gin ON videos USING GIN (tags)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('videos');
    }
};
