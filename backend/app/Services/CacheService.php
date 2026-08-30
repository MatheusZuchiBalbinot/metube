<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\FeedSection;
use App\Models\Playlist;
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
 * Each group is controlled by two config keys under cache.metube.*:
 *   ttl    → seconds to cache the value (integers only)
 *   active → when false the callback is called directly, bypassing cache
 *
 * Larastan infers the return type of each Cache::remember call from the
 * typed Closure PHPDoc, so no explicit assertions or casts are needed here.
 *
 * Heavy read groups (feed, user feed, recommendations) use Cache::flexible()
 * for stale-while-revalidate: within the fresh window the cached value is
 * returned as-is; past it (but within the stale window) the stale value is
 * served immediately while a single deferred request rebuilds the entry,
 * preventing a cache stampede when a popular key expires. flexible() is
 * inherited by TaggedCache from Repository, so it composes with tags() and
 * works on every store that provides locks (Redis in production, array in
 * tests).
 *
 * Key namespaces and tags:
 *   feed             → paginated public video feed
 *   channel:{uuid}   → channel info + paginated channel videos
 *   video:{vuid}     → video metadata + AI summary
 *   user:{id}        → playlists + subscriptions + history events
 */
class CacheService
{
    /**
     * The fresh window is the configured TTL; the stale window doubles it,
     * giving an equally long grace period for background refresh.
     *
     * @return array{0: int, 1: int}
     */
    private function staleWindow(string $ttlConfigKey): array
    {
        $ttl = (int) config($ttlConfigKey);

        return [$ttl, $ttl * 2];
    }

    /**
     * Bypasses the cache entirely when the group is deactivated (see class docblock).
     *
     * @template T
     *
     * @param string $group Dot-path under cache.metube.* holding this group's active/ttl config
     * @param list<string> $tags
     * @param Closure(): T $callback
     *
     * @return T
     */
    private function remember(string $group, array $tags, string $key, Closure $callback): mixed
    {
        if (!(bool) config("cache.metube.{$group}.active")) {
            return $callback();
        }

        return Cache::tags($tags)->remember($key, config("cache.metube.{$group}.ttl"), $callback);
    }

    /**
     * Bypasses the cache entirely when the group is deactivated (see class docblock).
     *
     * @template T
     *
     * @param string $group Dot-path under cache.metube.* holding this group's active/ttl config
     * @param list<string> $tags
     * @param Closure(): T $callback
     *
     * @return T
     */
    private function rememberFlexible(string $group, array $tags, string $key, Closure $callback): mixed
    {
        if (!(bool) config("cache.metube.{$group}.active")) {
            return $callback();
        }

        return Cache::tags($tags)->flexible($key, $this->staleWindow("cache.metube.{$group}.ttl"), $callback);
    }

    /**
     * Thin wrapper around Cache::add so throttling never bypasses CacheService
     * directly (repo rule: every cache operation goes through this class).
     *
     * @return bool True when the key was free and is now claimed (caller may proceed);
     *              false when it was already claimed (caller should be throttled)
     */
    public function throttle(string $key, int $seconds): bool
    {
        return Cache::add($key, 1, now()->addSeconds($seconds));
    }

    /**
     * @param Closure(): LengthAwarePaginator<int, Video> $callback
     *
     * @return LengthAwarePaginator<int, Video>
     */
    public function rememberFeed(int $page, Closure $callback): LengthAwarePaginator
    {
        return $this->rememberFlexible('feed', ['feed'], "feed:page:{$page}", $callback);
    }

    public function forgetFeed(): void
    {
        Cache::tags(['feed'])->flush();
    }

    /**
     * @param Closure(): User $callback
     */
    public function rememberChannelInfo(string $uuid, Closure $callback): User
    {
        return $this->remember('channel.info', ["channel:{$uuid}"], "channel:info:{$uuid}", $callback);
    }

    /**
     * @param Closure(): LengthAwarePaginator<int, Video> $callback
     *
     * @return LengthAwarePaginator<int, Video>
     */
    public function rememberChannelVideos(string $uuid, int $page, Closure $callback): LengthAwarePaginator
    {
        return $this->remember('channel.videos', ["channel:{$uuid}"], "channel:videos:{$uuid}:page:{$page}", $callback);
    }

    public function forgetChannel(string $uuid): void
    {
        Cache::tags(["channel:{$uuid}"])->flush();
    }

    /**
     * @param Closure(): Video $callback
     */
    public function rememberVideoMeta(string $vuid, Closure $callback): Video
    {
        return $this->remember('video.meta', ["video:{$vuid}"], "video:meta:{$vuid}", $callback);
    }

    /**
     * Deliberately does NOT cache null — when the summary is not yet generated,
     * each request re-queries so the result appears as soon as it exists without
     * waiting for a TTL to expire.
     *
     * @param Closure(): (VideoSummary|null) $callback
     */
    public function getOrCacheVideoSummary(string $vuid, Closure $callback): ?VideoSummary
    {
        if (!(bool) config('cache.metube.video.summary.active')) {
            return $callback();
        }

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

    public function forgetVideo(string $vuid): void
    {
        Cache::tags(["video:{$vuid}"])->flush();
    }

    /**
     * @param Closure(): Collection<int, Playlist> $callback
     *
     * @return Collection<int, Playlist>
     */
    public function rememberUserPlaylists(int $userId, Closure $callback): Collection
    {
        return $this->remember('user.playlists', ["user:{$userId}"], "user:playlists:{$userId}", $callback);
    }

    public function forgetUserPlaylists(int $userId): void
    {
        Cache::tags(["user:{$userId}"])->forget("user:playlists:{$userId}");
    }

    /**
     * @param Closure(): Collection<int, User> $callback
     *
     * @return Collection<int, User>
     */
    public function rememberUserSubscriptions(int $userId, Closure $callback): Collection
    {
        return $this->remember('user.subscriptions', ["user:{$userId}"], "user:subscriptions:{$userId}", $callback);
    }

    public function forgetUserSubscriptions(int $userId): void
    {
        Cache::tags(["user:{$userId}"])->forget("user:subscriptions:{$userId}");
    }

    /**
     * @param Closure(): list<array{date: string, count: int}> $callback
     *
     * @return list<array{date: string, count: int}>
     */
    public function rememberHistoryEvents(int $userId, Closure $callback): array
    {
        return $this->remember('user.history_events', ["user:{$userId}"], "user:history-events:{$userId}", $callback);
    }

    public function forgetHistoryEvents(int $userId): void
    {
        Cache::tags(["user:{$userId}"])->forget("user:history-events:{$userId}");
    }

    /**
     * @param Closure(): Collection<int, Video> $callback
     *
     * @return Collection<int, Video>
     */
    public function rememberRecommendations(int $userId, int $page, Closure $callback): Collection
    {
        $tags = ["user:{$userId}"];
        $key = "user:recommendations:{$userId}:page:{$page}";

        return $this->rememberFlexible('recommendations', $tags, $key, $callback);
    }

    /**
     * @param int|null $userId Authenticated user id, or null for guests
     * @param Closure(): array<int, FeedSection> $callback
     *
     * @return array<int, FeedSection>
     */
    public function rememberUserFeed(?int $userId, Closure $callback): array
    {
        $tags = $userId !== null ? ['feed', "user:{$userId}"] : ['feed'];
        $key = $userId !== null ? "feed:user:{$userId}" : 'feed:guest';

        return $this->rememberFlexible('feed', $tags, $key, $callback);
    }
}
