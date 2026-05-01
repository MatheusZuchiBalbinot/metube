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
