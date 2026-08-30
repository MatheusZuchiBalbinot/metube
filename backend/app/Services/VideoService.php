<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\PaginationSize;
use App\DTOs\VideoListFilterDTO;
use App\Enums\VideoStatus;
use App\Models\User;
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
     * Caches the default feed (no search/tags/status filters) for 60 seconds.
     * A non-published `status` filter is a privileged read scoped to the
     * requester's own channel (see {@see self::queryVideos()}), so it is
     * never eligible for the shared cache.
     */
    public function listVideos(VideoListFilterDTO $filters, ?User $user = null): LengthAwarePaginator
    {
        $shouldCache = !$filters->hasFilters();

        if (!$shouldCache) {
            return $this->queryVideos($filters, $user);
        }

        $cachedQuery = fn () => $this->queryVideos($filters, $user);

        return $this->cache->rememberFeed($filters->page, $cachedQuery);
    }

    /**
     * Result is cached for 300 s with the channel relation eager-loaded.
     *
     * @throws ModelNotFoundException
     */
    public function getVideoByUuid(string $vuid): Video
    {
        $queryFn = fn () => Video::query()->byVuid($vuid)->with('channel')->firstOrFail();

        return $this->cache->rememberVideoMeta($vuid, $queryFn);
    }

    /**
     * A `status` filter other than "published" is a privileged read — those
     * videos belong to their owner — so it is only honored when the request
     * is authenticated, and even then it is forced to the requester's own
     * channel. This is a defense-in-depth complement to
     * {@see \App\Http\Requests\Video\IndexVideoRequest::authorize()}, which
     * already rejects unauthenticated privileged-status requests before this
     * method ever runs.
     */
    private function queryVideos(VideoListFilterDTO $filters, ?User $user): LengthAwarePaginator
    {
        $query = Video::query()->filter([
            'page' => $filters->page,
            'search' => $filters->search,
            'tags' => $filters->tags,
            'status' => $filters->status,
        ])->with('channel');

        if ($filters->status === null) {
            $query = $query->published();
        } elseif ($filters->status !== VideoStatus::PUBLISHED->value) {
            $query = $user !== null
                ? $query->where('channel_id', $user->id)
                // Defense in depth: no authenticated owner to scope to, so never
                // leak non-published videos. IndexVideoRequest::authorize()
                // already blocks this case before it reaches the service.
                : $query->whereRaw('1 = 0');
        }

        return $query->paginate(PaginationSize::VIDEO_LIST);
    }
}
