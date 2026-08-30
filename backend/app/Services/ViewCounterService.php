<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\ViewCounterStore;
use App\Models\Video;

/**
 * ViewCounterService — Buffered video view counter.
 *
 * Hot videos (viral feeds) would otherwise serialize on `UPDATE videos SET
 * views = views + 1 WHERE id = ?` row-level locks. The view buffer is abstracted
 * behind {@see ViewCounterStore}: the Redis-backed store INCRs counters off the
 * hot path, while a synchronous store writes straight to the database in
 * environments without Redis. This service orchestrates draining the buffer and
 * applying the accumulated counts to the videos table.
 */
class ViewCounterService
{
    /**
     * @param ViewCounterStore $store Buffer backend (Redis in production, synchronous in tests)
     */
    public function __construct(private readonly ViewCounterStore $store) {}

    public function increment(int $videoId): void
    {
        $this->store->increment($videoId);
    }

    /**
     * Drains the buffer atomically and applies one UPDATE per dirty video.
     * Concurrent increments arriving mid-flush are preserved for the next cycle
     * by the store implementation.
     */
    public function flush(): int
    {
        $counts = $this->store->pullDirtyCounts();

        if ($counts === []) {
            return 0;
        }

        $updated = 0;

        foreach ($counts as $videoId => $count) {
            if ($count <= 0) {
                continue;
            }

            Video::query()->where('id', $videoId)->increment('views', $count);
            $updated++;
        }

        return $updated;
    }
}
