<?php

namespace App\Services;

use App\Models\User;
use App\Models\Video;
use App\Models\VideoSummary;
use Closure;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * CacheService — Typed cache wrapper for all application cache groups.
 *
 * Larastan infers the return type of each `Cache::remember` call from the
 * typed Closure PHPDoc, so no explicit assertions or casts are needed here.
 *
 * Key namespaces and tags:
 *   channel:{uuid}   → channel info + paginated channel videos
 *   video:{vuid}     → video metadata + AI summary
 *   user:{id}        → playlists + subscriptions + history events
 *
 * Flushing a tag removes all keys under that namespace at once.
 */
class CacheService
{
    // -------------------------------------------------------------------------
    // Channel
    // -------------------------------------------------------------------------

    /**
     * Return the cached channel (User) for the given UUID, or resolve and store it.
     *
     * @param  string  $uuid  Channel UUID
     * @param  Closure(): User  $callback  DB resolver on cache miss
     * @return User Channel user
     */
    public function rememberChannelInfo(string $uuid, Closure $callback): User
    {
        return Cache::tags(["channel:{$uuid}"])
            ->remember("channel:info:{$uuid}", 600, $callback);
    }

    /**
     * Return the cached paginated video list for a channel page.
     *
     * @param  string  $uuid  Channel UUID
     * @param  int  $page  Page number
     * @param  Closure(): LengthAwarePaginator<int, Video>  $callback
     * @return LengthAwarePaginator<int, Video>
     */
    public function rememberChannelVideos(string $uuid, int $page, Closure $callback): LengthAwarePaginator
    {
        return Cache::tags(["channel:{$uuid}"])
            ->remember("channel:videos:{$uuid}:page:{$page}", 120, $callback);
    }

    /**
     * Flush all cached data for a channel (info + all video pages).
     *
     * @param  string  $uuid  Channel UUID
     */
    public function forgetChannel(string $uuid): void
    {
        Cache::tags(["channel:{$uuid}"])->flush();
    }

    // -------------------------------------------------------------------------
    // Video
    // -------------------------------------------------------------------------

    /**
     * Return the cached video for the given vuid, or resolve and store it.
     *
     * @param  string  $vuid  Video vuid
     * @param  Closure(): Video  $callback  DB resolver on cache miss
     */
    public function rememberVideoMeta(string $vuid, Closure $callback): Video
    {
        return Cache::tags(["video:{$vuid}"])
            ->remember("video:meta:{$vuid}", 300, $callback);
    }

    /**
     * Return the cached AI summary for a video, storing it forever when present.
     *
     * Deliberately does NOT cache null — when the summary is not yet generated,
     * each request re-queries so the result appears as soon as it exists without
     * waiting for a TTL to expire.
     *
     * @param  string  $vuid  Video vuid
     * @param  Closure(): (VideoSummary|null)  $callback  DB resolver on cache miss
     */
    public function getOrCacheVideoSummary(string $vuid, Closure $callback): ?VideoSummary
    {
        $key = "video:summary:{$vuid}";
        $tag = "video:{$vuid}";

        $cached = Cache::tags([$tag])->get($key);
        if ($cached instanceof VideoSummary) {
            return $cached;
        }

        $summary = $callback();
        if ($summary instanceof VideoSummary) {
            Cache::tags([$tag])->forever($key, $summary);
        }

        return $summary;
    }

    /**
     * Flush all cached data for a video (metadata + summary).
     *
     * @param  string  $vuid  Video vuid
     */
    public function forgetVideo(string $vuid): void
    {
        Cache::tags(["video:{$vuid}"])->flush();
    }

    // -------------------------------------------------------------------------
    // User — playlists
    // -------------------------------------------------------------------------

    /**
     * Return the cached playlist collection for a user.
     *
     * @param  Closure(): Collection<int, \App\Models\Playlist>  $callback
     * @return Collection<int, \App\Models\Playlist>
     */
    public function rememberUserPlaylists(int $userId, Closure $callback): Collection
    {
        return Cache::tags(["user:{$userId}"])
            ->remember("user:playlists:{$userId}", 300, $callback);
    }

    /**
     * Invalidate the playlist cache for a user.
     */
    public function forgetUserPlaylists(int $userId): void
    {
        Cache::forget("user:playlists:{$userId}");
    }

    // -------------------------------------------------------------------------
    // User — subscriptions
    // -------------------------------------------------------------------------

    /**
     * Return the cached subscription collection for a user.
     *
     * @param  Closure(): Collection<int, \App\Models\User>  $callback
     * @return Collection<int, \App\Models\User>
     */
    public function rememberUserSubscriptions(int $userId, Closure $callback): Collection
    {
        return Cache::tags(["user:{$userId}"])
            ->remember("user:subscriptions:{$userId}", 300, $callback);
    }

    /**
     * Invalidate the subscription cache for a user.
     */
    public function forgetUserSubscriptions(int $userId): void
    {
        Cache::forget("user:subscriptions:{$userId}");
    }

    // -------------------------------------------------------------------------
    // User — history events (heatmap)
    // -------------------------------------------------------------------------

    /**
     * Return the cached watch-history heatmap for a user.
     *
     * @param  Closure(): list<array{date: string, count: int}>  $callback
     * @return list<array{date: string, count: int}>
     */
    public function rememberHistoryEvents(int $userId, Closure $callback): array
    {
        return Cache::tags(["user:{$userId}"])
            ->remember("user:history-events:{$userId}", 300, $callback);
    }

    /**
     * Invalidate the history-events cache for a user.
     */
    public function forgetHistoryEvents(int $userId): void
    {
        Cache::forget("user:history-events:{$userId}");
    }
}
