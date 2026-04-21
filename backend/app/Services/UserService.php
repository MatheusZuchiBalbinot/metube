<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection as BaseCollection;

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
     * Get all liked videos for a user.
     */
    public function getUserLikes(User $user): LengthAwarePaginator
    {
        return $user->likes()->paginate(15);
    }

    /**
     * Get all saved videos for a user from Watch Later playlist.
     */
    public function getUserSaved(User $user): LengthAwarePaginator
    {
        return $user->getWatchLaterPlaylist()->videos()->paginate(15);
    }

    /**
     * Get all subscriptions for a user.
     *
     * @return Collection<User>
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
     * Get watch history events grouped by date.
     *
     * Useful for activity heatmap on user profile.
     *
     * @return array<string, array{date: string, count: int, videos: list}>
     */
    public function getHistoryEvents(User $user): array
    {
        $events = $user->history()
            ->select('id', 'video_id', 'watched_at')
            ->with('video')
            ->get()
            ->groupBy(fn ($event) => $event->watched_at->toDateString());

        return $events->map(function (BaseCollection $group) {
            return [
                'date' => $group->first()->watched_at->toDateString(),
                'count' => $group->count(),
                'videos' => $group->pluck('video')->values(),
            ];
        })->toArray();
    }
}
