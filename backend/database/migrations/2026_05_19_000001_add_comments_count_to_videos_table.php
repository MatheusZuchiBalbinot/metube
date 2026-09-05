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
    }

    public function down(): void
    {
        Schema::table('videos', function (Blueprint $table): void {
            $table->dropColumn('comments_count');
        });
    }
};
