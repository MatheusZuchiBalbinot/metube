<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\ViewCounterStore;
use Illuminate\Contracts\Redis\Factory as RedisFactory;
use Illuminate\Support\Facades\Log;
use RedisException;

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

    /**
     * Atomically reads, clears, and un-flags one counter in a single EVAL —
     * a separate GETDEL + SREM leaves a gap where a concurrent INCR/SADD can
     * get silently dropped by the SREM, undercounting that view.
     */
    private const LUA_DRAIN_COUNTER = <<<'LUA'
        local val = redis.call('GET', KEYS[1])
        if val then
            redis.call('DEL', KEYS[1])
        end
        redis.call('SREM', KEYS[2], ARGV[1])
        return val
        LUA;

    public function __construct(private readonly RedisFactory $redis) {}

    /**
     * Fails soft on a Redis outage: a view not being counted is not worth
     * turning into a 500 for the request that's actually watching the video
     * (e.g. VideoController::recordView) — log it and move on.
     */
    public function increment(int $videoId): void
    {
        try {
            $conn = $this->redis->connection();
            $conn->command('INCR', [self::COUNTER_KEY . $videoId]);
            $conn->command('SADD', [self::DIRTY_SET, $videoId]);
        } catch (RedisException $e) {
            Log::warning('RedisViewCounterStore: increment failed, view not counted', [
                'video_id' => $videoId,
                'exception' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Atomically read and reset every pending counter (see LUA_DRAIN_COUNTER).
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

            // phpredis takes EVAL as (script, args, numberOfKeys); args holds keys then ARGV.
            $delta = $conn->command('eval', [self::LUA_DRAIN_COUNTER, [$key, self::DIRTY_SET, $videoId], 2]);

            $count = (int) $delta;

            if ($count <= 0) {
                continue;
            }

            $counts[$videoId] = $count;
        }

        return $counts;
    }
}
