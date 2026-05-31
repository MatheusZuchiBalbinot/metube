<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('videos', function (Blueprint $table): void {
            $table->unsignedInteger('comments_count')->default(0)->after('views');
        });

        // Backfill from existing comments table so the counter is consistent.
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement(<<<'SQL'
                UPDATE videos v
                SET comments_count = sub.cnt
                FROM (
                    SELECT video_id, COUNT(*) AS cnt
                    FROM comments
                    GROUP BY video_id
                ) sub
                WHERE v.id = sub.video_id
            SQL);
        } else {
            $rows = DB::table('comments')
                ->select('video_id', DB::raw('COUNT(*) as cnt'))
                ->groupBy('video_id')
                ->get();

            foreach ($rows as $row) {
                DB::table('videos')
                    ->where('id', $row->video_id)
                    ->update(['comments_count' => (int) $row->cnt]);
            }
        }

        // Composite index for channel pages: status filter + recency sort.
        Schema::table('videos', function (Blueprint $table): void {
            $table->index(['channel_id', 'status', 'published_at'], 'videos_channel_status_pub_idx');
        });

        // Top-level comments per video, ordered by recency (most common feed).
        if ($driver === 'pgsql') {
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

        // Unread notifications: header badge polls this for every authenticated request.
        if ($driver === 'pgsql') {
            DB::statement('
                CREATE INDEX notifications_user_unread_idx
                ON notifications (notifiable_id, notifiable_type, created_at DESC)
                WHERE read_at IS NULL
            ');
        }

        // History events: GROUP BY DATE(watched_at) needs a functional index to skip seq scan.
        if ($driver === 'pgsql') {
            DB::statement('
                CREATE INDEX watch_histories_user_date_idx
                ON watch_histories (user_id, (DATE(watched_at)))
            ');
        }
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS watch_histories_user_date_idx');
            DB::statement('DROP INDEX IF EXISTS notifications_user_unread_idx');
            DB::statement('DROP INDEX IF EXISTS comments_video_top_level_idx');
        } else {
            Schema::table('comments', function (Blueprint $table): void {
                $table->dropIndex('comments_video_top_level_idx');
            });
        }

        Schema::table('videos', function (Blueprint $table): void {
            $table->dropIndex('videos_channel_status_pub_idx');
            $table->dropColumn('comments_count');
        });
    }
};
