<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\PaginationSize;
use App\Enums\VideoEventType;
use App\Models\User;
use App\Models\UserAnalytic;
use App\Models\UserSubscription;
use App\Models\Video;
use App\Models\WatchHistory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

final class RecommendationService
{
    /**
     * Hard cap on candidate videos loaded into PHP for scoring.
     *
     * Without this, scoring loaded the entire published catalogue into memory
     * (O(catalogue) per request, a memory spike per Octane worker). We now
     * pre-filter in SQL and cap the pool, trading a slightly narrower candidate
     * set for bounded, predictable memory and CPU.
     */
    private const CANDIDATE_LIMIT = 500;

    /**
     * Cap on how many recently watched video ids feed the `whereNotIn` exclusion.
     *
     * The exclusion only needs to cover the candidate window, so an unbounded
     * watch history is unnecessary and would bloat the bound parameter list.
     */
    private const WATCHED_EXCLUSION_LIMIT = 500;

    /**
     * Cap on candidates considered when finding videos related to one video.
     */
    private const RELATED_CANDIDATE_LIMIT = 300;

    public function __construct(private readonly CacheService $cache) {}

    /**
     * Get recommended videos for a user with server-side scoring.
     *
     * @return Collection<int, Video>
     */
    public function forUser(User $user, int $page = 1): Collection
    {
        return $this->cache->rememberRecommendations(
            $user->id,
            $page,
            /**
             * @return Collection<int, Video>
             */
            function () use ($user, $page): Collection {
                $userEventScores = $this->getUserEventScores($user->id);

                if ($userEventScores->isEmpty()) {
                    return $this->popularVideos($page);
                }

                $tagAffinity = $this->deriveTagAffinity($userEventScores);
                $channelAffinity = $this->deriveChannelAffinity($userEventScores);
                $subscribedChannelIds = $this->getSubscribedChannelIds($user->id);
                $watchedVideoIds = $this->getWatchedVideoIds($user->id);
                $candidates = $this->getCandidateVideos(
                    $watchedVideoIds,
                    array_keys($tagAffinity),
                    $this->affinityChannelIds($channelAffinity, $subscribedChannelIds),
                );

                if ($candidates->isEmpty()) {
                    return $candidates;
                }

                $maxViews = max(1, (int) ($candidates->max('views') ?? 1));
                $maxChannelAffinity = $channelAffinity !== [] ? max($channelAffinity) : 0.0;

                $scored = $candidates
                    ->map(fn (Video $v) => [
                        'video' => $v,
                        'score' => $this->score(
                            $v,
                            $tagAffinity,
                            $channelAffinity,
                            $subscribedChannelIds,
                            $maxViews,
                            $maxChannelAffinity,
                        ),
                    ])
                    ->sortByDesc('score')
                    ->values();

                $paginated = $this->paginate($scored, $page);

                return $paginated->map(fn (array $item) => $item['video'])->values();
            },
        );
    }

    /**
     * Get videos related to a given video, scored by similarity.
     *
     * Ranks a bounded candidate pool (same channel, tag overlap and a popular
     * sample — see getRelatedCandidates) by tag overlap with the source video,
     * a same-channel bonus, popularity and freshness. Because the pool always
     * tops up with popular videos, the result is never empty as long as other
     * published videos exist — tag overlap is a boost, not a hard filter.
     *
     * @param Video $video Source video to find related content for
     * @param int $limit Maximum number of related videos to return
     *
     * @return Collection<int, Video>
     */
    public function relatedTo(Video $video, int $limit = PaginationSize::RELATED): Collection
    {
        $targetTags = $video->tags ?? [];

        $candidates = $this->getRelatedCandidates($video, $targetTags);

        if ($candidates->isEmpty()) {
            return $candidates;
        }

        $maxViews = max(1, (int) ($candidates->max('views') ?? 1));

        return $candidates
            ->map(fn (Video $candidate) => [
                'video' => $candidate,
                'score' => $this->relatedScore($candidate, $video, $targetTags, $maxViews),
            ])
            ->sortByDesc('score')
            ->take($limit)
            ->map(fn (array $item) => $item['video'])
            ->values();
    }

    /**
     * Score a candidate's relevance to a source video.
     *
     * Score = (tagOverlap × 0.50) + (sameChannel × 0.20) + (popularity × 0.20) + (freshness × 0.10)
     *
     * @param array<string> $targetTags Tags of the source video
     */
    private function relatedScore(Video $candidate, Video $source, array $targetTags, int $maxViews): float
    {
        $candidateTags = $candidate->tags ?? [];
        $overlap = count(array_intersect($targetTags, $candidateTags));
        $tagScore = $targetTags === [] ? 0.0 : $overlap / count($targetTags);

        $sameChannelScore = $candidate->channel_id === $source->channel_id ? 1.0 : 0.0;
        $popularScore = log1p($candidate->views) / log1p($maxViews);
        $ageInDays = abs(now()->diffInDays($candidate->published_at));
        $freshScore = exp(-$ageInDays / 30);

        return ($tagScore * 0.50) + ($sameChannelScore * 0.20) + ($popularScore * 0.20) + ($freshScore * 0.10);
    }

    /**
     * Get user event scores aggregated by video over the last 30 days.
     *
     * @return Collection<int, float>
     */
    private function getUserEventScores(int $userId): Collection
    {
        $events = UserAnalytic::query()->forUser($userId)
            ->recentDays(30)
            ->get();

        return $events
            ->groupBy('video_id')
            ->map(fn ($videoEvents) => $videoEvents->sum(fn (UserAnalytic $e) => $this->eventWeight($e)));
    }

    /**
     * Calculate weight for a single event based on its type.
     */
    private function eventWeight(UserAnalytic $event): float
    {
        return match ($event->event_type) {
            VideoEventType::FINISH => 1.0,
            VideoEventType::LIKE => 0.8,
            VideoEventType::SAVE => 0.7,
            VideoEventType::CLICK => 0.4,
            VideoEventType::VIEW => 0.2,
            VideoEventType::DISLIKE => -0.5,
            VideoEventType::SKIP => $this->skipWeight($event),
            default => 0.0,
        };
    }

    /**
     * Calculate weight for SKIP events based on watch completion percentage.
     */
    private function skipWeight(UserAnalytic $event): float
    {
        $percent = (int) ($event->payload['percent'] ?? 100);

        return $percent < 20 ? -0.3 : 0.0;
    }

    /**
     * Derive tag affinity from positively-scored videos.
     *
     * @param Collection<int, float> $videoScores
     *
     * @return array<string, float>
     */
    private function deriveTagAffinity(Collection $videoScores): array
    {
        $positiveVideoIds = $videoScores->filter(fn (float $score) => $score > 0)->keys()->toArray();

        if ($positiveVideoIds === []) {
            return [];
        }

        $videos = Video::whereIn('id', $positiveVideoIds)->get();

        $tagWeights = [];

        foreach ($videos as $video) {
            $videoScore = $videoScores[$video->id] ?? 0;

            foreach ($video->tags ?? [] as $tag) {
                $tagWeights[$tag] = ($tagWeights[$tag] ?? 0) + $videoScore;
            }
        }

        return $tagWeights;
    }

    /**
     * Derive channel affinity from positively-scored videos.
     *
     * @param Collection<int, float> $videoScores
     *
     * @return array<int, float>
     */
    private function deriveChannelAffinity(Collection $videoScores): array
    {
        $positiveVideoIds = $videoScores->filter(fn (float $score) => $score > 0)->keys()->toArray();

        if ($positiveVideoIds === []) {
            return [];
        }

        $columns = ['id', 'channel_id'];
        $videos = Video::whereIn('id', $positiveVideoIds)->get($columns);

        $channelWeights = [];

        foreach ($videos as $video) {
            $videoScore = $videoScores[$video->id] ?? 0.0;
            $channelWeights[$video->channel_id] = ($channelWeights[$video->channel_id] ?? 0.0) + $videoScore;
        }

        return $channelWeights;
    }

    /**
     * Get IDs of channels the user is subscribed to.
     *
     * @return array<int>
     */
    private function getSubscribedChannelIds(int $userId): array
    {
        return UserSubscription::query()
            ->where('user_id', $userId)
            ->pluck('channel_id')
            ->toArray();
    }

    /**
     * Get IDs of the user's most recently watched videos.
     *
     * Capped at WATCHED_EXCLUSION_LIMIT: the exclusion only has to cover the
     * candidate window, so loading the entire history would needlessly bloat
     * the `whereNotIn` bound parameter list.
     *
     * @return array<int>
     */
    private function getWatchedVideoIds(int $userId): array
    {
        return WatchHistory::where('user_id', $userId)
            ->orderByDesc('watched_at')
            ->limit(self::WATCHED_EXCLUSION_LIMIT)
            ->pluck('video_id')
            ->all();
    }

    /**
     * Merge behavioural channel affinity with explicit subscriptions into one id set.
     *
     * @param array<int, float> $channelAffinity
     * @param array<int> $subscribedChannelIds
     *
     * @return array<int>
     */
    private function affinityChannelIds(array $channelAffinity, array $subscribedChannelIds): array
    {
        return array_values(array_unique(array_merge(
            array_keys($channelAffinity),
            $subscribedChannelIds,
        )));
    }

    /**
     * Get a bounded pool of candidate videos for scoring.
     *
     * Builds a hybrid pool instead of the full catalogue: videos that match the
     * user's tag affinity OR come from an affinity/subscribed channel, plus a
     * popular-video sample so discovery survives even with thin affinity. The
     * whole pool is capped at CANDIDATE_LIMIT and ordered by views so the most
     * relevant rows are kept when the cap bites. Already-watched videos are
     * excluded in SQL.
     *
     * @param array<int> $excludeIds Recently watched video ids to exclude
     * @param array<string> $affinityTags Tags the user has positive affinity for
     * @param array<int> $affinityChannelIds Channels the user follows or interacts with
     *
     * @return Collection<int, Video>
     */
    private function getCandidateVideos(array $excludeIds, array $affinityTags, array $affinityChannelIds): Collection
    {
        $hasAffinity = $affinityTags !== [] || $affinityChannelIds !== [];

        if (!$hasAffinity) {
            return $this->basePool($excludeIds)->get();
        }

        $affinityPool = $this->basePool($excludeIds)
            ->where(function (Builder $query) use ($affinityTags, $affinityChannelIds): void {
                $this->whereMatchesTags($query, $affinityTags);

                if ($affinityChannelIds !== []) {
                    $query->orWhereIn('channel_id', $affinityChannelIds);
                }
            })
            ->get();

        // Top up with a popular sample so unfamiliar-but-relevant content can
        // still surface; de-dupe by folding the affinity ids into the exclusion
        // set passed to basePool (keeps the query Builder<Video>-typed).
        $affinityIds = $affinityPool->pluck('id')->all();
        $popularPool = $this->basePool(array_merge($excludeIds, $affinityIds))->get();

        return $affinityPool
            ->merge($popularPool)
            ->take(self::CANDIDATE_LIMIT)
            ->values();
    }

    /**
     * Base published-candidate query: excludes watched ids, eager-loads the
     * channel, orders by popularity and caps the row count.
     *
     * @param array<int, mixed> $excludeIds
     *
     * @return Builder<Video>
     */
    private function basePool(array $excludeIds): Builder
    {
        return Video::query()->published()
            ->whereNotIn('id', $excludeIds)
            ->with('channel')
            ->orderByDesc('views')
            ->limit(self::CANDIDATE_LIMIT);
    }

    /**
     * Get a bounded candidate pool for related-video scoring.
     *
     * Pre-filters in SQL to same-channel videos, tag-overlap videos and a
     * popular sample (so the result is never empty while published videos
     * exist), capped at RELATED_CANDIDATE_LIMIT. The source video is excluded.
     *
     * @param array<string> $targetTags Tags of the source video
     *
     * @return Collection<int, Video>
     */
    private function getRelatedCandidates(Video $video, array $targetTags): Collection
    {
        $relevant = $this->relatedBaseQuery($video)
            ->where(function (Builder $query) use ($video, $targetTags): void {
                $query->where('channel_id', $video->channel_id);
                $this->whereMatchesTags($query, $targetTags, orWhere: true);
            })
            ->get();

        // Guarantee a non-empty result whenever other published videos exist:
        // top up with popular videos outside the relevant set. The relevant ids
        // go into the base query's exclusion so it stays Builder<Video>-typed.
        $relevantIds = $relevant->pluck('id')->all();
        $popular = $this->relatedBaseQuery($video, $relevantIds)->get();

        return $relevant
            ->merge($popular)
            ->take(self::RELATED_CANDIDATE_LIMIT)
            ->values();
    }

    /**
     * Base related-candidate query: published, excludes the source (and any
     * extra ids), eager-loads the channel, orders by popularity and caps rows.
     *
     * @param Video $video Source video to exclude
     * @param array<int, mixed> $excludeIds Additional video ids to exclude
     *
     * @return Builder<Video>
     */
    private function relatedBaseQuery(Video $video, array $excludeIds = []): Builder
    {
        return Video::query()->published()
            ->where('id', '!=', $video->id)
            ->whereNotIn('id', $excludeIds)
            ->orderByDesc('views')
            ->with('channel')
            ->limit(self::RELATED_CANDIDATE_LIMIT);
    }

    /**
     * Constrain a query to videos carrying any of the given tags.
     *
     * Mirrors Video::scopeFilter tag handling: a GIN-indexed `?|` on PostgreSQL,
     * an OR chain of whereJsonContains on SQLite (tests). No-op for empty tags.
     *
     * @param Builder<Video> $query
     * @param array<string> $tags
     * @param bool $orWhere When true, attach the tag clause with OR (used to
     *                      combine with a sibling same-channel condition)
     */
    private function whereMatchesTags(Builder $query, array $tags, bool $orWhere = false): void
    {
        if ($tags === []) {
            return;
        }

        $isPgsql = $query->getConnection()->getDriverName() === 'pgsql';

        $clause = function (Builder $inner) use ($tags, $isPgsql): void {
            if ($isPgsql) {
                $placeholders = implode(',', array_fill(0, count($tags), '?'));
                $inner->whereRaw("tags ??| array[{$placeholders}]", array_values($tags));

                return;
            }

            foreach ($tags as $tag) {
                $inner->orWhereJsonContains('tags', $tag);
            }
        };

        if ($orWhere) {
            $query->orWhere($clause);

            return;
        }

        $query->where($clause);
    }

    /**
     * Calculate composite score for a video.
     *
     * Score = (tagScore × 0.40) + (channelScore × 0.30) + (popularScore × 0.20) + (freshScore × 0.10)
     *
     * @param array<string, float> $tagAffinity
     * @param array<int, float> $channelAffinity
     * @param array<int> $subscribedChannelIds
     */
    private function score(
        Video $video,
        array $tagAffinity,
        array $channelAffinity,
        array $subscribedChannelIds,
        int $maxViews,
        float $maxChannelAffinity,
    ): float {
        $tagScore = $this->tagScore($video, $tagAffinity);
        $channelScore = $this->channelScore($video, $channelAffinity, $subscribedChannelIds, $maxChannelAffinity);
        $popularScore = log1p($video->views) / log1p($maxViews);
        $freshScore = exp(-now()->diffInDays($video->published_at) / 30);

        return ($tagScore * 0.40) + ($channelScore * 0.30) + ($popularScore * 0.20) + ($freshScore * 0.10);
    }

    /**
     * Calculate tag relevance score for a video.
     *
     * @param array<string, float> $tagAffinity
     */
    private function tagScore(Video $video, array $tagAffinity): float
    {
        $tags = $video->tags ?? [];

        if ($tags === []) {
            return 0.0;
        }

        $totalWeight = collect($tags)
            ->sum(fn (string $tag) => $tagAffinity[$tag] ?? 0);

        return $totalWeight / count($tags);
    }

    /**
     * Calculate channel affinity score for a video.
     *
     * channelScore = (subscriptionScore × 0.40) + (channelAffinityScore × 0.60)
     *
     * Subscription provides a 0.40 floor for channels the user actively follows.
     * Behavioral affinity (log-normalized watch history) contributes the remaining 0.60.
     *
     * @param array<int, float> $channelAffinity
     * @param array<int> $subscribedChannelIds
     */
    private function channelScore(
        Video $video,
        array $channelAffinity,
        array $subscribedChannelIds,
        float $maxChannelAffinity,
    ): float {
        $isSubscribed = in_array($video->channel_id, $subscribedChannelIds, true);
        $subscriptionScore = $isSubscribed ? 1.0 : 0.0;

        $rawAffinity = $channelAffinity[$video->channel_id] ?? 0.0;
        $channelAffinityScore = $maxChannelAffinity > 0.0
            ? log1p($rawAffinity) / log1p($maxChannelAffinity)
            : 0.0;

        return ($subscriptionScore * 0.40) + ($channelAffinityScore * 0.60);
    }

    /**
     * Get popular videos for new users with no event history.
     *
     * @return Collection<int, Video>
     */
    private function popularVideos(int $page): Collection
    {
        $perPage = PaginationSize::RECOMMENDATIONS;

        return Video::query()->published()
            ->orderByDesc('views')
            ->with('channel')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();
    }

    /**
     * Paginate a collection of items.
     *
     * @template T
     *
     * @param Collection<int, T> $items
     *
     * @return Collection<int, T>
     */
    private function paginate(Collection $items, int $page): Collection
    {
        $perPage = PaginationSize::RECOMMENDATIONS;
        $start = ($page - 1) * $perPage;

        return $items->skip($start)->take($perPage);
    }
}
