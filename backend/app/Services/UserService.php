<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

/**
 * UserService — Business logic for authenticated user data.
 *
 * Responsible for:
 * - User library (likes, saves, subscriptions)
 * - Watch history management
 */
class UserService
{
    /**
     * Get all videos owned by the user, regardless of status (including processing/failed).
     */
    public function getUserVideos(User $user): LengthAwarePaginator
    {
        return $user->videos()->with('channel')->latest()->paginate(50);
    }

    /**
     * Get all liked videos for a user.
     */
    public function getUserLikes(User $user): LengthAwarePaginator
    {
        return $user->likes()->with('channel')->paginate(15);
    }

    /**
     * Get all saved videos for a user from Watch Later playlist.
     */
    public function getUserSaved(User $user): LengthAwarePaginator
    {
        return $user->getWatchLaterPlaylist()->videos()->with('channel')->paginate(15);
    }

    /**
     * Get all subscriptions for a user.
     *
     * @return Collection<int, User>
     */
    public function getUserSubscriptions(User $user): Collection
    {
        return $user->subscriptions()->get();
    }

    /**
     * Get watch history with optional period filter.
     *
     * @param  string  $period  today|week|month|all
     */
    public function getUserHistory(User $user, string $period = 'all'): LengthAwarePaginator
    {
        return $user->history()
            ->filterByPeriod($period)
            ->with('video')
            ->paginate(20);
    }

    /**
     * Clear all watch history for a user.
     */
    public function clearUserHistory(User $user): void
    {
        $user->history()->delete();
    }

    /**
     * Remove a specific video from user's history.
     *
     * @param  string  $vuid  Video UUID
     */
    public function removeFromHistory(User $user, string $vuid): void
    {
        $user->history()
            ->whereHas('video', fn ($q) => $q->where('vuid', $vuid))
            ->delete();
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
            ->mapWithKeys(fn ($p) => [$p->video->vuid => $p->percent])
            ->toArray();
    }

    /**
     * Get watch activity aggregated by day, newest first, limited to 365 days.
     *
     * Aggregates in SQL to avoid loading all history records into memory.
     *
     * @return list<array{date: string, count: int}>
     */
    public function getHistoryEvents(User $user): array
    {
        /** @var list<array{date: string, count: int}> */
        return DB::table('watch_histories')
            ->where('user_id', $user->id)
            ->select(
                DB::raw('DATE(watched_at) as date'),
                DB::raw('COUNT(*) as count'),
            )
            ->groupBy(DB::raw('DATE(watched_at)'))
            ->orderByDesc(DB::raw('DATE(watched_at)'))
            ->limit(365)
            ->get()
            ->map(fn (object $row) => [
                'date' => (string) $row->date,
                'count' => (int) $row->count,
            ])
            ->values()
            ->toArray();
    }
}
