<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\PaginationSize;
use App\Enums\VideoEventType;
use App\Models\User;
use App\Models\UserAnalytic;
use App\Models\Video;
use App\Models\WatchHistory;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class RecommendationService
{
    public function __construct(private readonly CacheService $cache) {}

    /**
     * Get recommended videos for a user with server-side scoring.
     *
     * @return Collection<int, Video>
     */
    public function forUser(User $user, int $page = 1): Collection
    {
        $recommendations = $this->cache->rememberRecommendations(
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
                $candidates = $this->getCandidateVideos($watchedVideoIds);

                if ($candidates->isEmpty()) {
                    return $candidates;
                }

                $maxViews = max(1, (int) ($candidates->max('views') ?? 1));
                $maxChannelAffinity = $channelAffinity !== [] ? max($channelAffinity) : 0.0;

                $scored = $candidates
                    ->map(fn (Video $v) => [
                        'video' => $v,
                        'score' => $this->score($v, $tagAffinity, $channelAffinity, $subscribedChannelIds, $maxViews, $maxChannelAffinity),
                    ])
                    ->sortByDesc('score')
                    ->values();

                $paginated = $this->paginate($scored, $page);

                return $paginated->map(fn (array $item) => $item['video'])->values();
            },
        );

        return $recommendations;
    }

    /**
     * Get user event scores aggregated by video over the last 30 days.
     *
     * @return Collection<int, float>
     */
    private function getUserEventScores(int $userId): Collection
    {
        $events = UserAnalytic::forUser($userId)
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

        $videos = Video::whereIn('id', $positiveVideoIds)->get(['id', 'channel_id']);

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
     * @return int[]
     */
    private function getSubscribedChannelIds(int $userId): array
    {
        return DB::table('user_subscriptions')
            ->where('user_id', $userId)
            ->pluck('channel_id')
            ->toArray();
    }

    /**
     * Get IDs of videos the user has already watched.
     *
     * @return int[]
     */
    private function getWatchedVideoIds(int $userId): array
    {
        return WatchHistory::where('user_id', $userId)->pluck('video_id')->toArray();
    }

    /**
     * Get candidate videos (published, excluding watched).
     *
     * @param int[] $excludeIds
     *
     * @return Collection<int, Video>
     */
    private function getCandidateVideos(array $excludeIds): Collection
    {
        return Video::published()
            ->whereNotIn('id', $excludeIds)
            ->with('channel')
            ->get();
    }

    /**
     * Calculate composite score for a video.
     *
     * Score = (tagScore × 0.40) + (channelScore × 0.30) + (popularScore × 0.20) + (freshScore × 0.10)
     *
     * @param array<string, float> $tagAffinity
     * @param array<int, float> $channelAffinity
     * @param int[] $subscribedChannelIds
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
     * @param int[] $subscribedChannelIds
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

        return Video::published()
            ->orderByDesc('views')
            ->with('channel')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();
    }

    /**
     * Paginate a collection of items (15 per page).
     *
     * @template T
     *
     * @param Collection<int, T> $items
     *
     * @return Collection<int, T>
     */
    private function paginate(Collection $items, int $page): Collection
    {
        $perPage = 15;
        $start = ($page - 1) * $perPage;

        return $items->skip($start)->take($perPage);
    }
}
