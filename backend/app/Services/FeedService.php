<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\PaginationSize;
use App\DTOs\FeedSection;
use App\Enums\FeedSectionKey;
use App\Models\User;
use App\Models\UserSubscription;
use App\Models\Video;
use App\Models\WatchHistory;
use App\Support\ScoringSignals;
use Illuminate\Support\Collection;

/**
 * FeedService — Composes the home feed shelves server-side.
 *
 * Logged-in users get a personalised set (subscriptions + "because you watched")
 * plus the generic shelves; guests get only the generic shelves.
 */
final class FeedService
{
    /**
     * Trending look-back window. Reduced from an effectively all-time 730 days
     * so "trending" reflects recent momentum rather than lifetime view counts.
     */
    private const TRENDING_WINDOW_DAYS = 90;

    /**
     * Half-life (in days) for the trending time-decay applied to raw views, so
     * an older-but-popular video does not permanently outrank fresher ones.
     */
    private const TRENDING_HALF_LIFE_DAYS = 14;

    private const TRENDING_CANDIDATE_POOL = 100;

    /**
     * Cap on recent watch-history rows scanned to derive the dominant tag, so
     * the "because you watched" shelf never loads an unbounded history.
     */
    private const WATCHED_HISTORY_LIMIT = 200;

    private const MIN_TAG_SHELF_VIDEOS = 4;

    private const SHORTS_TAG = 'shorts';

    public function __construct(private readonly CacheService $cache) {}

    /**
     * @return array<int, FeedSection>
     */
    public function forUser(?User $user): array
    {
        return $this->cache->rememberUserFeed(
            $user?->id,
            /**
             * @return array<int, FeedSection>
             */
            function () use ($user): array {
                $sections = [];

                // Both personalised shelves need a logged-in user, so they're
                // computed together behind a single check instead of two.
                $subscriptions = null;
                $becauseYouWatched = null;

                if ($user !== null) {
                    $subscriptions = $this->subscriptions($user);
                    $becauseYouWatched = $this->becauseYouWatched($user);
                }

                if ($subscriptions !== null) {
                    $this->appendIfNotEmpty($sections, FeedSectionKey::SUBSCRIPTIONS, $subscriptions);
                }

                $this->appendIfNotEmpty($sections, FeedSectionKey::TRENDING, $this->trending());
                $this->appendIfNotEmpty($sections, FeedSectionKey::RECENT, $this->recent());

                if ($becauseYouWatched !== null) {
                    $sections[] = $becauseYouWatched;
                }

                $this->appendIfNotEmpty($sections, FeedSectionKey::SHORTS, $this->shorts());

                return $sections;
            },
        );
    }

    /**
     * @return Collection<int, Video>
     */
    private function subscriptions(User $user): Collection
    {
        $channelIds = UserSubscription::query()
            ->where('user_id', $user->id)
            ->pluck('channel_id')
            ->all();

        return Video::query()
            ->whereIn('channel_id', $channelIds)
            ->feedShelf()
            ->get();
    }

    /**
     * Trending shelf: recent videos ranked by time-decayed views, excluding shorts.
     *
     * Pulls a bounded popular pool from the trending window, then re-ranks it in
     * PHP by views weighted with an exponential recency decay (half-life
     * TRENDING_HALF_LIFE_DAYS). This rewards recent momentum over lifetime view
     * counts while keeping the SQL side a single capped, index-friendly query.
     *
     * @return Collection<int, Video>
     */
    private function trending(): Collection
    {
        return Video::query()->published()
            ->where('published_at', '>=', now()->subDays(self::TRENDING_WINDOW_DAYS))
            ->excludingTag(self::SHORTS_TAG)
            ->orderByDesc('views')
            ->with('channel')
            ->limit(self::TRENDING_CANDIDATE_POOL)
            ->get()
            ->sortByDesc(fn (Video $video) => $this->trendingScore($video))
            ->take(PaginationSize::FEED_SHELF)
            ->values();
    }

    /**
     * @return float Decayed score; higher means more trending
     */
    private function trendingScore(Video $video): float
    {
        return log1p($video->views) * ScoringSignals::freshness($video->published_at, self::TRENDING_HALF_LIFE_DAYS);
    }

    /**
     * @return Collection<int, Video>
     */
    private function recent(): Collection
    {
        return Video::query()->feedShelf()->get();
    }

    /**
     * @return Collection<int, Video>
     */
    private function shorts(): Collection
    {
        return Video::query()
            ->filter(['tags' => [self::SHORTS_TAG]])
            ->feedShelf()
            ->get();
    }

    /**
     * @return FeedSection|null Null when there is no dominant tag with enough videos
     */
    private function becauseYouWatched(User $user): ?FeedSection
    {
        $watchedIds = WatchHistory::query()
            ->where('user_id', $user->id)
            ->orderByDesc('watched_at')
            ->limit(self::WATCHED_HISTORY_LIMIT)
            ->pluck('video_id')
            ->all();

        if ($watchedIds === []) {
            return null;
        }

        $topTag = $this->topWatchedTag($watchedIds);

        if ($topTag === null) {
            return null;
        }

        $videos = Video::query()
            ->filter(['tags' => [$topTag]])
            ->feedShelf()
            ->get();

        if ($videos->count() < self::MIN_TAG_SHELF_VIDEOS) {
            return null;
        }

        return new FeedSection(FeedSectionKey::BECAUSE_YOU_WATCHED, $topTag, $videos);
    }

    /**
     * Append a labelless feed section built from $videos, unless it's empty.
     *
     * Collapses the "call shelf → check not-empty → push" pattern repeated
     * across every shelf that doesn't need a dynamic label (only "because you
     * watched" does, and it already returns a ready-made FeedSection or null).
     *
     * @param array<int, FeedSection> $sections
     * @param Collection<int, Video> $videos
     */
    private function appendIfNotEmpty(array &$sections, FeedSectionKey $key, Collection $videos): void
    {
        if ($videos->isEmpty()) {
            return;
        }

        $sections[] = new FeedSection($key, null, $videos);
    }

    /**
     * @param array<int, int> $watchedIds
     */
    private function topWatchedTag(array $watchedIds): ?string
    {
        $videos = Video::whereIn('id', $watchedIds)->get(['id', 'tags']);

        $frequency = [];

        foreach ($videos as $video) {
            foreach ($video->tags ?? [] as $tag) {
                if ($tag === self::SHORTS_TAG) {
                    continue;
                }

                $frequency[$tag] = ($frequency[$tag] ?? 0) + 1;
            }
        }

        if ($frequency === []) {
            return null;
        }

        arsort($frequency);

        return (string) array_key_first($frequency);
    }
}
