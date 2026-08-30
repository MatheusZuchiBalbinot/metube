<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\ViewCounterStore;
use Illuminate\Contracts\Redis\Factory as RedisFactory;

/**
 * Redis-backed buffered implementation of {@see ViewCounterStore}.
 *
 * Hot videos (viral feeds) would otherwise serialize on `UPDATE videos SET
 * views = views + 1 WHERE id = ?` row-level locks. We INCR in Redis instead,
 * then drain the buffer periodically via the `views:flush` command.
 *
 * Keys:
 *   metube:views:pending:{id}   counter (deleted when pulled)
 *   metube:views:dirty          set of ids with pending increments
 */
final class RedisViewCounterStore implements ViewCounterStore
{
    private const COUNTER_KEY = 'metube:views:pending:';

    private const DIRTY_SET = 'metube:views:dirty';

    public function __construct(private readonly RedisFactory $redis) {}

    public function increment(int $videoId): void
    {
        $conn = $this->redis->connection();
        $conn->command('INCR', [self::COUNTER_KEY . $videoId]);
        $conn->command('SADD', [self::DIRTY_SET, $videoId]);
    }

    /**
     * Atomically read and reset every pending counter.
     *
     * Each id is drained with GETDEL so a concurrent INCR after the read either
     * landed before (counted now) or after (re-flagged for the next cycle).
     *
     * @return array<int, int>
     */
    public function pullDirtyCounts(): array
    {
        $conn = $this->redis->connection();
        /** @var array<int, string> $ids */
        $ids = (array) $conn->command('SMEMBERS', [self::DIRTY_SET]);

        if ($ids === []) {
            return [];
        }

        $counts = [];

        foreach ($ids as $rawId) {
            $videoId = (int) $rawId;
            $key = self::COUNTER_KEY . $videoId;

            $delta = $conn->command('GETDEL', [$key]);
            $conn->command('SREM', [self::DIRTY_SET, $videoId]);

            $count = (int) $delta;

            if ($count <= 0) {
                continue;
            }

            $counts[$videoId] = $count;
        }

        return $counts;
    }
}
