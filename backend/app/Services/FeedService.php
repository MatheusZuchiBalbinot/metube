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
    private const TRENDING_WINDOW_DAYS = 730;

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

        return Video::published()
            ->whereIn('channel_id', $channelIds)
            ->newestPublished()
            ->with('channel')
            ->limit(PaginationSize::FEED_SHELF)
            ->get();
    }

    /**
     * Most-viewed recently published videos, excluding shorts.
     *
     * @return Collection<int, Video>
     */
    private function trending(): Collection
    {
        return Video::published()
            ->where('published_at', '>=', now()->subDays(self::TRENDING_WINDOW_DAYS))
            ->orderByDesc('views')
            ->with('channel')
            ->limit(PaginationSize::FEED_SHELF * 2)
            ->get()
            ->reject(fn (Video $video) => in_array(self::SHORTS_TAG, $video->tags ?? [], true))
            ->take(PaginationSize::FEED_SHELF)
            ->values();
    }

    /**
     * Newest published videos overall.
     *
     * @return Collection<int, Video>
     */
    private function recent(): Collection
    {
        return Video::published()
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
        return Video::published()
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
            ->pluck('video_id')
            ->all();

        if ($watchedIds === []) {
            return null;
        }

        $topTag = $this->topWatchedTag($watchedIds);

        if ($topTag === null) {
            return null;
        }

        $videos = Video::published()
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
