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
 *   feed             → paginated public video feed
 *   channel:{uuid}   → channel info + paginated channel videos
 *   video:{vuid}     → video metadata + AI summary
 *   user:{id}        → playlists + subscriptions + history events
 *
 * Flushing a tag removes all keys under that namespace at once.
 * Forgetting a single tagged key requires Cache::tags()->forget(), not Cache::forget().
 */
class CacheService
{
    /**
     * Return the cached paginated public feed, or resolve and store it.
     *
     * @param  Closure(): LengthAwarePaginator<int, Video>  $callback
     * @return LengthAwarePaginator<int, Video>
     */
    public function rememberFeed(int $page, Closure $callback): LengthAwarePaginator
    {
        return Cache::tags(['feed'])
            ->remember("feed:page:{$page}", config('cache.ttl.feed'), $callback);
    }

    /**
     * Flush the entire feed cache (all pages).
     */
    public function forgetFeed(): void
    {
        Cache::tags(['feed'])->flush();
    }

    /**
     * Return the cached channel (User) for the given UUID, or resolve and store it.
     *
     * @param  Closure(): User  $callback  DB resolver on cache miss
     * @return User Channel user
     */
    public function rememberChannelInfo(string $uuid, Closure $callback): User
    {
        return Cache::tags(["channel:{$uuid}"])
            ->remember("channel:info:{$uuid}", config('cache.ttl.channel_info'), $callback);
    }

    /**
     * Return the cached paginated video list for a channel page.
     *
     * @param  Closure(): LengthAwarePaginator<int, Video>  $callback
     * @return LengthAwarePaginator<int, Video>
     */
    public function rememberChannelVideos(string $uuid, int $page, Closure $callback): LengthAwarePaginator
    {
        return Cache::tags(["channel:{$uuid}"])
            ->remember("channel:videos:{$uuid}:page:{$page}", config('cache.ttl.channel_videos'), $callback);
    }

    /**
     * Flush all cached data for a channel (info + all video pages).
     */
    public function forgetChannel(string $uuid): void
    {
        Cache::tags(["channel:{$uuid}"])->flush();
    }

    /**
     * Return the cached video for the given vuid, or resolve and store it.
     *
     * @param  Closure(): Video  $callback  DB resolver on cache miss
     */
    public function rememberVideoMeta(string $vuid, Closure $callback): Video
    {
        return Cache::tags(["video:{$vuid}"])
            ->remember("video:meta:{$vuid}", config('cache.ttl.video_meta'), $callback);
    }

    /**
     * Return the cached AI summary for a video, storing it forever when present.
     *
     * Deliberately does NOT cache null — when the summary is not yet generated,
     * each request re-queries so the result appears as soon as it exists without
     * waiting for a TTL to expire.
     *
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
     */
    public function forgetVideo(string $vuid): void
    {
        Cache::tags(["video:{$vuid}"])->flush();
    }

    /**
     * Return the cached playlist collection for a user.
     *
     * @param  Closure(): Collection<int, \App\Models\Playlist>  $callback
     * @return Collection<int, \App\Models\Playlist>
     */
    public function rememberUserPlaylists(int $userId, Closure $callback): Collection
    {
        return Cache::tags(["user:{$userId}"])
            ->remember("user:playlists:{$userId}", config('cache.ttl.user_data'), $callback);
    }

    /**
     * Invalidate the playlist cache for a user.
     */
    public function forgetUserPlaylists(int $userId): void
    {
        Cache::tags(["user:{$userId}"])->forget("user:playlists:{$userId}");
    }

    /**
     * Return the cached subscription collection for a user.
     *
     * @param  Closure(): Collection<int, \App\Models\User>  $callback
     * @return Collection<int, \App\Models\User>
     */
    public function rememberUserSubscriptions(int $userId, Closure $callback): Collection
    {
        return Cache::tags(["user:{$userId}"])
            ->remember("user:subscriptions:{$userId}", config('cache.ttl.user_data'), $callback);
    }

    /**
     * Invalidate the subscription cache for a user.
     */
    public function forgetUserSubscriptions(int $userId): void
    {
        Cache::tags(["user:{$userId}"])->forget("user:subscriptions:{$userId}");
    }

    /**
     * Return the cached watch-history heatmap for a user.
     *
     * @param  Closure(): list<array{date: string, count: int}>  $callback
     * @return list<array{date: string, count: int}>
     */
    public function rememberHistoryEvents(int $userId, Closure $callback): array
    {
        return Cache::tags(["user:{$userId}"])
            ->remember("user:history-events:{$userId}", config('cache.ttl.user_data'), $callback);
    }

    /**
     * Invalidate the history-events cache for a user.
     */
    public function forgetHistoryEvents(int $userId): void
    {
        Cache::tags(["user:{$userId}"])->forget("user:history-events:{$userId}");
    }
}
