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
        Schema::create('video_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('video_id')->constrained()->cascadeOnDelete();
            $table->string('source', 50)->nullable();
            $table->string('session_id', 100)->nullable();
            $table->timestamp('watched_at');
            // On SQLite (tests): plain nullable column populated by the app.
            // On PostgreSQL: replaced below with a GENERATED ALWAYS AS column.
            $table->timestamp('watched_hour')->nullable();

            $table->unique(['user_id', 'video_id', 'watched_hour']);
            $table->index('video_id');
            $table->index('user_id');
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE video_views DROP COLUMN watched_hour');
            DB::statement("ALTER TABLE video_views ADD COLUMN watched_hour TIMESTAMP GENERATED ALWAYS AS (date_trunc('hour', watched_at)) STORED");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('video_views');
    }
};
