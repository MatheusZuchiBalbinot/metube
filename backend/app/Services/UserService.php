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
    /**
     * Maximum number of subscriptions returned by getUserSubscriptions.
     *
     * Caps the result so a user with an unbounded number of subscriptions
     * never loads every channel row into memory at once.
     */
    private const MAX_SUBSCRIPTIONS = 1000;

    public function __construct(private readonly CacheService $cache) {}

    public function getUserLikes(User $user): LengthAwarePaginator
    {
        return $user->likes()->with('channel')->paginate(PaginationSize::USER_LIKES);
    }

    public function getUserSaved(User $user): LengthAwarePaginator
    {
        return $user->getWatchLaterPlaylist()->videos()->with('channel')->paginate(PaginationSize::USER_SAVED);
    }

    /**
     * Capped at the MAX_SUBSCRIPTIONS most recent channels to avoid loading an
     * unbounded number of rows into memory. The response shape remains an
     * unenveloped list, preserving the existing UserResource contract.
     *
     * @return Collection<int, User>
     */
    public function getUserSubscriptions(User $user): Collection
    {
        return $this->cache->rememberUserSubscriptions(
            $user->id,
            fn () => $user->subscriptions()->limit(self::MAX_SUBSCRIPTIONS)->get(),
        );
    }

    public function getUserHistory(User $user, HistoryPeriod $period = HistoryPeriod::ALL): LengthAwarePaginator
    {
        return $user->history()
            ->filterByPeriod($period)
            ->with('video')
            ->paginate(PaginationSize::USER_HISTORY);
    }

    public function clearUserHistory(User $user): void
    {
        $user->history()->delete();
        $this->cache->forgetHistoryEvents($user->id);
    }

    public function removeFromHistory(User $user, string $vuid): void
    {
        $user->history()
            ->byVideoVuid($vuid)
            ->delete();
        $this->cache->forgetHistoryEvents($user->id);
    }

    /**
     * Maximum number of progress rows returned by getUserProgress.
     *
     * Caps the result to the most recently updated entries so users with an
     * unbounded watch history never load every row into memory at once.
     */
    private const MAX_PROGRESS_ROWS = 500;

    /**
     * Capped at the MAX_PROGRESS_ROWS most recently updated entries to avoid
     * loading an unbounded number of rows into memory.
     *
     * @return array<string, int> Map of vuid => percent
     */
    public function getUserProgress(User $user): array
    {
        return $user->progress()
            ->with('video:id,vuid')
            ->latest('updated_at')
            ->limit(self::MAX_PROGRESS_ROWS)
            ->get()
            ->mapWithKeys(function ($progress) {
                return [
                    $progress->video->vuid => $progress->percent,
                ];
            })
            ->toArray();
    }

    /**
     * Aggregates in SQL to avoid loading all history records into memory.
     * Result is cached for 300 s and invalidated on each new view via VideoViewed event.
     *
     * @return list<array{date: string, count: int}>
     */
    public function getHistoryEvents(User $user): array
    {
        return $this->cache->rememberHistoryEvents(
            $user->id,
            fn () => $this->queryHistoryEvents($user),
        );
    }

    /**
     * @return list<array{date: string, count: int}>
     */
    private function queryHistoryEvents(User $user): array
    {
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
    }
}
