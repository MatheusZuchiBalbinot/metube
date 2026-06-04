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
        Schema::create('watch_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('video_id')->constrained()->cascadeOnDelete();
            $table->timestamp('watched_at')->useCurrent();

            $table->index(['user_id', 'watched_at']);
            $table->index('video_id');
        });

        // watched_hour truncates watched_at to the hour and drives the dedup
        // constraint (user_id, video_id, watched_hour) so recordView is
        // idempotent within the same clock-hour.
        // On pgsql it is a GENERATED ALWAYS AS (stored computed) column.
        // On other drivers (SQLite in tests) it is a plain nullable column
        // populated by the application before insert.
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("
                ALTER TABLE watch_histories
                ADD COLUMN watched_hour TIMESTAMP
                    GENERATED ALWAYS AS (date_trunc('hour', watched_at)) STORED
            ");
            DB::statement('
                ALTER TABLE watch_histories
                ADD CONSTRAINT watch_histories_dedup UNIQUE (user_id, video_id, watched_hour)
            ');
        } else {
            Schema::table('watch_histories', function (Blueprint $table) {
                $table->timestamp('watched_hour')->nullable();
                $table->unique(['user_id', 'video_id', 'watched_hour'], 'watch_histories_dedup');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('watch_histories');
    }
};
