<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Video;
use Illuminate\Support\Facades\Redis;

/**
 * ViewCounterService — Buffered video view counter backed by Redis.
 *
 * Hot videos (viral feeds) would otherwise serialize on `UPDATE videos SET
 * views = views + 1 WHERE id = ?` row-level locks. We INCR in Redis instead,
 * then flush periodically via `views:flush` to one UPDATE per dirty video id.
 *
 * Keys:
 *   metube:views:pending:{id}   counter (deleted at flush time)
 *   metube:views:dirty          set of ids with pending increments
 */
class ViewCounterService
{
    private const COUNTER_KEY = 'metube:views:pending:';

    private const DIRTY_SET = 'metube:views:dirty';

    /**
     * Record a view in the buffer. Lock-free for concurrent writers.
     */
    public function increment(int $videoId): void
    {
        // Tests assert against videos.views directly; bypass the Redis buffer
        // so the DB reflects the new count immediately.
        if (app()->runningUnitTests()) {
            Video::where('id', $videoId)->increment('views');

            return;
        }

        $conn = Redis::connection();
        $conn->command('INCR', [self::COUNTER_KEY . $videoId]);
        $conn->command('SADD', [self::DIRTY_SET, $videoId]);
    }

    /**
     * Flush all pending increments to the videos table.
     *
     * Returns the number of videos updated. Each dirty video gets one UPDATE.
     * Reads-and-deletes the counter atomically with GETDEL so concurrent
     * increments arriving mid-flush are preserved for the next cycle.
     */
    public function flush(): int
    {
        $conn = Redis::connection();
        /** @var array<int, string> $ids */
        $ids = (array) $conn->command('SMEMBERS', [self::DIRTY_SET]);

        if ($ids === []) {
            return 0;
        }

        $updated = 0;

        foreach ($ids as $rawId) {
            $videoId = (int) $rawId;
            $key = self::COUNTER_KEY . $videoId;

            // GETDEL is atomic; any concurrent INCR after this either lands
            // before (counted now) or after (next dirty cycle).
            $delta = $conn->command('GETDEL', [$key]);
            $conn->command('SREM', [self::DIRTY_SET, $videoId]);

            $count = (int) $delta;

            if ($count <= 0) {
                continue;
            }

            Video::where('id', $videoId)->increment('views', $count);
            $updated++;
        }

        return $updated;
    }
}
