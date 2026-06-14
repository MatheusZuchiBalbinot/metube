<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Abstracts the buffered view-counter storage backend.
 *
 * The default production implementation buffers increments in Redis to avoid
 * row-level lock contention on hot videos; a synchronous implementation writes
 * straight to the database for environments without Redis (tests / local).
 *
 * Swapping the backend is a single-file change: bind a different implementation
 * in AppServiceProvider::register() — no service needs to change.
 */
interface ViewCounterStore
{
    /**
     * Record a single view for the given video.
     *
     * @param int $videoId Internal primary key of the video
     */
    public function increment(int $videoId): void;

    /**
     * Atomically read and reset every pending counter.
     *
     * Returns a map of video id => pending view count for videos that have
     * buffered increments. Implementations must clear the returned counters so
     * a subsequent call does not double-count, while preserving increments that
     * arrive concurrently for the next cycle.
     *
     * @return array<int, int> Map of video id to pending view count
     */
    public function pullDirtyCounts(): array;
}
