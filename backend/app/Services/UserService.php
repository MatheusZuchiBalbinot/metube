<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\PaginationSize;
use App\Enums\HistoryPeriod;
use App\Models\User;
use App\Models\WatchHistory;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * UserService — Business logic for authenticated user data.
 *
 * Responsible for:
 * - User library (likes, saves, subscriptions)
 * - Watch history management
 */
final class UserService
{
    public function __construct(private readonly CacheService $cache) {}

    /**
     * Get all liked videos for a user.
     */
    public function getUserLikes(User $user): LengthAwarePaginator
    {
        return $user->likes()->with('channel')->paginate(PaginationSize::USER_LIKES);
    }

    /**
     * Get all saved videos for a user from Watch Later playlist.
     */
    public function getUserSaved(User $user): LengthAwarePaginator
    {
        return $user->getWatchLaterPlaylist()->videos()->with('channel')->paginate(PaginationSize::USER_SAVED);
    }

    /**
     * Get all subscriptions for a user.
     *
     * @return Collection<int, User>
     */
    public function getUserSubscriptions(User $user): Collection
    {
        return $this->cache->rememberUserSubscriptions(
            $user->id,
            fn () => $user->subscriptions()->get(),
        );
    }

    /**
     * Get watch history with optional period filter.
     */
    public function getUserHistory(User $user, HistoryPeriod $period = HistoryPeriod::ALL): LengthAwarePaginator
    {
        return $user->history()
            ->filterByPeriod($period)
            ->with('video')
            ->paginate(PaginationSize::USER_HISTORY);
    }

    /**
     * Clear all watch history for a user.
     */
    public function clearUserHistory(User $user): void
    {
        $user->history()->delete();
        $this->cache->forgetHistoryEvents($user->id);
    }

    /**
     * Remove a specific video from user's history.
     *
     * @param string $vuid Video UUID
     */
    public function removeFromHistory(User $user, string $vuid): void
    {
        $user->history()
            ->byVideoVuid($vuid)
            ->delete();
        $this->cache->forgetHistoryEvents($user->id);
    }

    /**
     * Get watch progress for all videos the user has started.
     *
     * @return array<string, int> Map of vuid => percent
     */
    public function getUserProgress(User $user): array
    {
        return $user->progress()
            ->with('video:id,vuid')
            ->get()
            ->mapWithKeys(function ($p) {
                $progressMap = [
                    $p->video->vuid => $p->percent,
                ];

                return $progressMap;
            })
            ->toArray();
    }

    /**
     * Get watch activity aggregated by day, newest first, limited to 365 days.
     *
     * Aggregates in SQL to avoid loading all history records into memory.
     * Result is cached for 300 s and invalidated on each new view via VideoViewed event.
     *
     * @return list<array{date: string, count: int}>
     */
    public function getHistoryEvents(User $user): array
    {
        return $this->cache->rememberHistoryEvents(
            $user->id,
            function () use ($user): array {
                /** @var list<array{date: string, count: int}> */
                return WatchHistory::query()
                    ->forUser($user->id)
                    ->select(
                        DB::raw('DATE(watched_at) as date'),
                        DB::raw('COUNT(*) as count'),
                    )
                    ->groupBy(DB::raw('DATE(watched_at)'))
                    ->orderByDesc(DB::raw('DATE(watched_at)'))
                    ->limit(PaginationSize::HISTORY_EVENTS_DAYS)
                    ->get()
                    ->map(function (WatchHistory $row): array {
                        return [
                            'date' => (string) $row->getAttribute('date'),
                            'count' => (int) $row->getAttribute('count'),
                        ];
                    })
                    ->values()
                    ->toArray();
            },
        );
    }
}
