<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\PaginationSize;
use App\Models\Video;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * VideoService — Read-only operations for videos.
 *
 * Responsible for:
 * - Listing videos with filters and pagination
 * - Retrieving individual video details
 *
 * Write operations are delegated to specialized services:
 * - VideoUploadService — create, finalize, delete
 * - VideoPublishingService — publish, update metadata
 * - VideoReactionService — user interactions
 * - VideoProgressService — watch progress
 * - VideoAiService — AI suggestions and summaries
 */
class VideoService
{
    public function __construct(private readonly CacheService $cache) {}

    /**
     * Get paginated videos with filters.
     *
     * Caches the default feed (no search/tags/status filters) for 60 seconds.
     *
     * @param array<string, mixed> $filters
     */
    public function listVideos(array $filters): LengthAwarePaginator
    {
        $hasFilters = isset($filters['search']) || isset($filters['tags']) || isset($filters['status']);

        if ($hasFilters) {
            return $this->queryVideos($filters);
        }

        $page = (int) ($filters['page'] ?? 1);

        return $this->cache->rememberFeed($page, fn () => $this->queryVideos($filters));
    }

    /**
     * Get a specific video by UUID.
     *
     * Result is cached for 300 s with the channel relation eager-loaded so that
     * `VideoResource` can render channel name/id without an extra query.
     *
     * @param string $vuid Video UUID
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function getVideoByUuid(string $vuid): Video
    {
        return $this->cache->rememberVideoMeta(
            $vuid,
            fn () => Video::where('vuid', $vuid)->with('channel')->firstOrFail(),
        );
    }

    /**
     * Execute the base video query with filters applied.
     *
     * @param array<string, mixed> $filters
     */
    private function queryVideos(array $filters): LengthAwarePaginator
    {
        $hasStatusFilter = isset($filters['status']);
        $query = Video::filter($filters)->with('channel');

        if (!$hasStatusFilter) {
            $query = $query->published();
        }

        return $query->paginate(PaginationSize::VIDEO_LIST);
    }
}
