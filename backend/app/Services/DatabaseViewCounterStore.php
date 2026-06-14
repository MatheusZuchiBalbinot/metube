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
     * Increment the video's view count directly in the database.
     *
     * @param int $videoId Internal primary key of the video
     */
    public function increment(int $videoId): void
    {
        Video::query()->where('id', $videoId)->increment('views');
    }

    /**
     * No buffer exists, so there is never anything pending to drain.
     *
     * @return array<int, int> Always an empty map
     */
    public function pullDirtyCounts(): array
    {
        return [];
    }
}
