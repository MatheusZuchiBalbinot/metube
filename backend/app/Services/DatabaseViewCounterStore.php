<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\ViewCounterStore;
use App\Models\Video;

/**
 * Synchronous, unbuffered implementation of {@see ViewCounterStore}.
 *
 * Increments are written straight to the `videos.views` column, making the new
 * count visible immediately. Used in environments without Redis (tests / local)
 * where buffering would only add a moving part; there is therefore nothing to
 * drain and {@see pullDirtyCounts()} always returns an empty map.
 */
final class DatabaseViewCounterStore implements ViewCounterStore
{
    /**
     * @param int $videoId Internal primary key of the video
     */
    public function increment(int $videoId): void
    {
        Video::query()->where('id', $videoId)->increment('views');
    }

    /**
     * @return array<int, int> Always empty — no buffer exists to drain.
     */
    public function pullDirtyCounts(): array
    {
        return [];
    }
}
