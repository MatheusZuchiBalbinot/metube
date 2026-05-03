<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            $this->createPartitioned();

            return;
        }

        Schema::create('user_analytics', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('video_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('channel_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('event_type', 20);
            $table->string('source', 32)->nullable();
            $table->string('session_id', 64)->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('occurred_at')->useCurrent();

            $table->index(['user_id', 'video_id', 'event_type']);
            $table->index(['video_id', 'event_type']);
            $table->index('occurred_at');
            $table->index(['user_id', 'event_type', 'occurred_at']);
            $table->index(['channel_id', 'event_type']);
            $table->index('session_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_analytics');
    }

    /**
     * Create user_analytics as a Postgres range-partitioned table by occurred_at.
     *
     * Pre-creates 14 monthly partitions (last month + next 12) plus a default
     * partition so any out-of-range insert still lands somewhere.
     */
    private function createPartitioned(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE user_analytics (
                id BIGSERIAL,
                user_id BIGINT NOT NULL,
                video_id BIGINT NULL,
                channel_id BIGINT NULL,
                event_type VARCHAR(20) NOT NULL,
                source VARCHAR(32) NULL,
                session_id VARCHAR(64) NULL,
                payload JSONB NULL,
                occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id, occurred_at),
                CONSTRAINT user_analytics_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT user_analytics_video_id_foreign FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
                CONSTRAINT user_analytics_channel_id_foreign FOREIGN KEY (channel_id) REFERENCES users(id) ON DELETE CASCADE
            ) PARTITION BY RANGE (occurred_at)
        SQL);

        DB::statement('CREATE INDEX user_analytics_user_id_video_id_event_type_index ON user_analytics (user_id, video_id, event_type)');
        DB::statement('CREATE INDEX user_analytics_video_id_event_type_index ON user_analytics (video_id, event_type)');
        DB::statement('CREATE INDEX user_analytics_occurred_at_index ON user_analytics (occurred_at)');
        DB::statement('CREATE INDEX user_analytics_user_id_event_type_occurred_at_index ON user_analytics (user_id, event_type, occurred_at)');
        DB::statement('CREATE INDEX user_analytics_channel_id_event_type_index ON user_analytics (channel_id, event_type)');
        DB::statement('CREATE INDEX user_analytics_session_id_index ON user_analytics (session_id)');

        $start = Carbon::now()->startOfMonth()->subMonth();

        for ($offset = 0; $offset < 14; $offset++) {
            $from = $start->copy()->addMonths($offset);
            $to = $from->copy()->addMonth();
            $partitionName = sprintf('user_analytics_%s', $from->format('Y_m'));

            DB::statement(sprintf(
                "CREATE TABLE %s PARTITION OF user_analytics FOR VALUES FROM ('%s') TO ('%s')",
                $partitionName,
                $from->toDateTimeString(),
                $to->toDateTimeString(),
            ));
        }

        DB::statement('CREATE TABLE user_analytics_default PARTITION OF user_analytics DEFAULT');
    }
};
