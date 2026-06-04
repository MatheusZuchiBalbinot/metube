<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\PaginationSize;
use App\DTOs\VideoListFilterDTO;
use App\Models\Video;
use Illuminate\Database\Eloquent\ModelNotFoundException;
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
final class VideoService
{
    public function __construct(private readonly CacheService $cache) {}

    /**
     * Get paginated videos with filters.
     *
     * Caches the default feed (no search/tags/status filters) for 60 seconds.
     */
    public function listVideos(VideoListFilterDTO $filters): LengthAwarePaginator
    {
        $shouldCache = !$filters->hasFilters();

        if (!$shouldCache) {
            return $this->queryVideos($filters);
        }

        $cachedQuery = fn () => $this->queryVideos($filters);

        return $this->cache->rememberFeed($filters->page, $cachedQuery);
    }

    /**
     * Get a specific video by UUID.
     *
     * Result is cached for 300 s with the channel relation eager-loaded.
     *
     * @throws ModelNotFoundException
     */
    public function getVideoByUuid(string $vuid): Video
    {
        $queryFn = fn () => Video::byVuid($vuid)->with('channel')->firstOrFail();

        return $this->cache->rememberVideoMeta($vuid, $queryFn);
    }

    /**
     * Get a video fully loaded for display, including the channel's subscriber count.
     *
     * Builds on getVideoByUuid (cached) and adds the subscriber count which changes
     * frequently and therefore must not be cached alongside the video record.
     *
     * @throws ModelNotFoundException
     */
    public function getVideoForDisplay(string $vuid): Video
    {
        $video = $this->getVideoByUuid($vuid);
        $video->channel->loadCount('subscribers');

        return $video;
    }

    /**
     * Execute the base video query with filters applied.
     */
    private function queryVideos(VideoListFilterDTO $filters): LengthAwarePaginator
    {
        $query = Video::filter([
            'page' => $filters->page,
            'search' => $filters->search,
            'tags' => $filters->tags,
            'status' => $filters->status,
        ])->with('channel');

        $shouldApplyPublished = $filters->status === null;

        if ($shouldApplyPublished) {
            $query = $query->published();
        }

        return $query->paginate(PaginationSize::VIDEO_LIST);
    }
}
