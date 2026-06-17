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

    /**
     * Candidate pool size pulled before applying decay ranking to trending.
     */
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
     * Build the ordered list of feed sections for a user (or guest when null).
     *
     * @param User|null $user Authenticated user, or null for the guest feed
     *
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

                if ($user !== null) {
                    $subscriptions = $this->subscriptions($user);

                    if ($subscriptions->isNotEmpty()) {
                        $sections[] = new FeedSection(FeedSectionKey::SUBSCRIPTIONS, null, $subscriptions);
                    }
                }

                $trending = $this->trending();

                if ($trending->isNotEmpty()) {
                    $sections[] = new FeedSection(FeedSectionKey::TRENDING, null, $trending);
                }

                $recent = $this->recent();

                if ($recent->isNotEmpty()) {
                    $sections[] = new FeedSection(FeedSectionKey::RECENT, null, $recent);
                }

                if ($user !== null) {
                    $becauseYouWatched = $this->becauseYouWatched($user);

                    if ($becauseYouWatched !== null) {
                        $sections[] = $becauseYouWatched;
                    }
                }

                $shorts = $this->shorts();

                if ($shorts->isNotEmpty()) {
                    $sections[] = new FeedSection(FeedSectionKey::SHORTS, null, $shorts);
                }

                return $sections;
            },
        );
    }

    /**
     * Newest published videos from the channels the user is subscribed to.
     *
     * @param User $user Authenticated user
     *
     * @return Collection<int, Video>
     */
    private function subscriptions(User $user): Collection
    {
        $channelIds = UserSubscription::query()
            ->where('user_id', $user->id)
            ->pluck('channel_id')
            ->all();

        return Video::query()->published()
            ->whereIn('channel_id', $channelIds)
            ->newestPublished()
            ->with('channel')
            ->limit(PaginationSize::FEED_SHELF)
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
            ->orderByDesc('views')
            ->with('channel')
            ->limit(self::TRENDING_CANDIDATE_POOL)
            ->get()
            ->reject(fn (Video $video) => in_array(self::SHORTS_TAG, $video->tags ?? [], true))
            ->sortByDesc(fn (Video $video) => $this->trendingScore($video))
            ->take(PaginationSize::FEED_SHELF)
            ->values();
    }

    /**
     * Time-decayed trending score for a video: views weighted by an exponential
     * decay on age since publication (half-life TRENDING_HALF_LIFE_DAYS).
     *
     * @param Video $video Video to score
     *
     * @return float Decayed score; higher means more trending
     */
    private function trendingScore(Video $video): float
    {
        $ageInDays = $video->published_at !== null
            ? abs(now()->diffInDays($video->published_at))
            : 0.0;

        $decay = exp(-M_LN2 * $ageInDays / self::TRENDING_HALF_LIFE_DAYS);

        return log1p($video->views) * $decay;
    }

    /**
     * Newest published videos overall.
     *
     * @return Collection<int, Video>
     */
    private function recent(): Collection
    {
        return Video::query()->published()
            ->newestPublished()
            ->with('channel')
            ->limit(PaginationSize::FEED_SHELF)
            ->get();
    }

    /**
     * Newest published shorts.
     *
     * @return Collection<int, Video>
     */
    private function shorts(): Collection
    {
        return Video::query()->published()
            ->filter(['tags' => [self::SHORTS_TAG]])
            ->newestPublished()
            ->with('channel')
            ->limit(PaginationSize::FEED_SHELF)
            ->get();
    }

    /**
     * Shelf of published videos sharing the user's most-watched tag.
     *
     * @param User $user Authenticated user
     *
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

        $videos = Video::query()->published()
            ->filter(['tags' => [$topTag]])
            ->newestPublished()
            ->with('channel')
            ->limit(PaginationSize::FEED_SHELF)
            ->get();

        if ($videos->count() < self::MIN_TAG_SHELF_VIDEOS) {
            return null;
        }

        return new FeedSection(FeedSectionKey::BECAUSE_YOU_WATCHED, $topTag, $videos);
    }

    /**
     * Most frequent tag across the given watched videos (excluding shorts).
     *
     * @param array<int, int> $watchedIds Watched video ids
     *
     * @return string|null The dominant tag, or null when none
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
