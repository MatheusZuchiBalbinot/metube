<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\PaginationSize;
use App\Enums\VideoEventType;
use App\Models\Builders\VideoBuilder;
use App\Models\User;
use App\Models\UserAnalytic;
use App\Models\UserSubscription;
use App\Models\Video;
use App\Models\WatchHistory;
use App\Support\ScoringSignals;
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

    private const RELATED_CANDIDATE_LIMIT = 300;

    /**
     * How far back user analytic events are considered when scoring
     * tag/channel affinity — bounds the query and keeps scoring reactive to
     * recent behavior rather than a user's entire history.
     */
    private const USER_EVENT_WINDOW_DAYS = 30;

    public function __construct(private readonly CacheService $cache) {}

    /**
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

                [$tagAffinity, $channelAffinity] = $this->affinities($userEventScores);
                $subscribedChannelIds = $this->getSubscribedChannelIds($user->id);
                $watchedVideoIds = $this->getWatchedVideoIds($user->id);
                $affinityTags = array_keys($tagAffinity);
                $affinityChannelIds = $this->affinityChannelIds($channelAffinity, $subscribedChannelIds);
                $candidates = $this->getCandidateVideos($watchedVideoIds, $affinityTags, $affinityChannelIds);

                if ($candidates->isEmpty()) {
                    return $candidates;
                }

                $maxViews = max(1, (int) ($candidates->max('views') ?? 1));
                $maxChannelAffinity = $channelAffinity !== [] ? max($channelAffinity) : 0.0;

                $scored = $candidates
                    ->map(fn (Video $video) => [
                        'video' => $video,
                        'score' => $this->score(
                            $video,
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
     * Ranks a bounded candidate pool (same channel, tag overlap and a popular
     * sample — see getRelatedCandidates) by tag overlap with the source video,
     * a same-channel bonus, popularity and freshness. Because the pool always
     * tops up with popular videos, the result is never empty as long as other
     * published videos exist — tag overlap is a boost, not a hard filter.
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
     * Score = (tagOverlap × 0.50) + (sameChannel × 0.20) + (popularity × 0.20) + (freshness × 0.10)
     *
     * @param array<string> $targetTags
     */
    private function relatedScore(Video $candidate, Video $source, array $targetTags, int $maxViews): float
    {
        $candidateTags = $candidate->tags ?? [];
        $overlap = count(array_intersect($targetTags, $candidateTags));
        $tagScore = $targetTags === [] ? 0.0 : $overlap / count($targetTags);

        $sameChannelScore = $candidate->channel_id === $source->channel_id ? 1.0 : 0.0;
        $popularScore = ScoringSignals::popularity($candidate->views, $maxViews);
        $freshScore = ScoringSignals::freshness($candidate->published_at);

        return ($tagScore * 0.50) + ($sameChannelScore * 0.20) + ($popularScore * 0.20) + ($freshScore * 0.10);
    }

    /**
     * @return Collection<int, float>
     */
    private function getUserEventScores(int $userId): Collection
    {
        $events = UserAnalytic::query()->forUser($userId)
            ->recentDays(self::USER_EVENT_WINDOW_DAYS)
            ->get();

        return $events
            ->groupBy('video_id')
            ->map(fn ($videoEvents) => $videoEvents->sum(fn (UserAnalytic $e) => $this->eventWeight($e)));
    }

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

    private function skipWeight(UserAnalytic $event): float
    {
        $percent = (int) ($event->payload['percent'] ?? 100);

        return $percent < 20 ? -0.3 : 0.0;
    }

    /**
     * Derive tag and channel affinity from positively-scored videos.
     *
     * Both affinities are computed from the same positively-scored video id
     * set, so this does it in a single filter and a single
     * `whereIn('id', ...)` query instead of the two independent round trips
     * (one a wasteful `SELECT *`) that a separate method per affinity used to
     * cost.
     *
     * @param Collection<int, float> $videoScores
     *
     * @return array{0: array<string, float>, 1: array<int, float>} [tagAffinity, channelAffinity]
     */
    private function affinities(Collection $videoScores): array
    {
        $positiveVideoIds = $videoScores->filter(fn (float $score) => $score > 0)->keys()->toArray();

        if ($positiveVideoIds === []) {
            return [[], []];
        }

        $videos = Video::whereIn('id', $positiveVideoIds)->get(['id', 'channel_id', 'tags']);

        $tagWeights = [];
        $channelWeights = [];

        foreach ($videos as $video) {
            $videoScore = $videoScores[$video->id] ?? 0.0;

            foreach ($video->tags ?? [] as $tag) {
                $tagWeights[$tag] = ($tagWeights[$tag] ?? 0.0) + $videoScore;
            }

            $channelWeights[$video->channel_id] = ($channelWeights[$video->channel_id] ?? 0.0) + $videoScore;
        }

        return [$tagWeights, $channelWeights];
    }

    /**
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
     * Builds a hybrid pool instead of the full catalogue: videos that match the
     * user's tag affinity OR come from an affinity/subscribed channel, plus a
     * popular-video sample so discovery survives even with thin affinity. The
     * whole pool is capped at CANDIDATE_LIMIT and ordered by views so the most
     * relevant rows are kept when the cap bites. Already-watched videos are
     * excluded in SQL.
     *
     * @param array<int> $excludeIds
     * @param array<string> $affinityTags
     * @param array<int> $affinityChannelIds
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
            ->where(function (VideoBuilder $query) use ($affinityTags, $affinityChannelIds): void {
                $query->withAnyTag($affinityTags);

                if ($affinityChannelIds === []) {
                    return;
                }

                $query->orWhereIn('channel_id', $affinityChannelIds);
            })
            ->get();

        // Top up with a popular sample so unfamiliar-but-relevant content can
        // still surface; de-dupe by folding the affinity ids into the exclusion
        // set passed to basePool (keeps the query VideoBuilder-typed).
        $affinityIds = $affinityPool->pluck('id')->all();
        $popularPool = $this->basePool(array_merge($excludeIds, $affinityIds))->get();

        return $affinityPool
            ->merge($popularPool)
            ->take(self::CANDIDATE_LIMIT)
            ->values();
    }

    /**
     * @param array<int, mixed> $excludeIds
     */
    private function basePool(array $excludeIds): VideoBuilder
    {
        return Video::query()->popularPool()
            ->whereNotIn('id', $excludeIds)
            ->limit(self::CANDIDATE_LIMIT);
    }

    /**
     * Pre-filters in SQL to same-channel videos, tag-overlap videos and a
     * popular sample (so the result is never empty while published videos
     * exist), capped at RELATED_CANDIDATE_LIMIT. The source video is excluded.
     *
     * @param array<string> $targetTags
     *
     * @return Collection<int, Video>
     */
    private function getRelatedCandidates(Video $video, array $targetTags): Collection
    {
        $relevant = $this->relatedBaseQuery($video)
            ->where(function (VideoBuilder $query) use ($video, $targetTags): void {
                $query->where('channel_id', $video->channel_id)
                    ->orWhere(function (VideoBuilder $tagQuery) use ($targetTags): void {
                        $tagQuery->withAnyTag($targetTags);
                    });
            })
            ->get();

        // Guarantee a non-empty result whenever other published videos exist:
        // top up with popular videos outside the relevant set. The relevant ids
        // go into the base query's exclusion so it stays VideoBuilder-typed.
        $relevantIds = $relevant->pluck('id')->all();
        $popular = $this->relatedBaseQuery($video, $relevantIds)->get();

        return $relevant
            ->merge($popular)
            ->take(self::RELATED_CANDIDATE_LIMIT)
            ->values();
    }

    /**
     * @param array<int, mixed> $excludeIds
     */
    private function relatedBaseQuery(Video $video, array $excludeIds = []): VideoBuilder
    {
        return Video::query()->popularPool()
            ->where('id', '!=', $video->id)
            ->whereNotIn('id', $excludeIds)
            ->limit(self::RELATED_CANDIDATE_LIMIT);
    }

    /**
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
        $popularScore = ScoringSignals::popularity($video->views, $maxViews);
        $freshScore = ScoringSignals::freshness($video->published_at);

        return ($tagScore * 0.40) + ($channelScore * 0.30) + ($popularScore * 0.20) + ($freshScore * 0.10);
    }

    /**
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
     * @return Collection<int, Video>
     */
    private function popularVideos(int $page): Collection
    {
        $perPage = PaginationSize::RECOMMENDATIONS;

        return Video::query()->popularPool()
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();
    }

    /**
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
