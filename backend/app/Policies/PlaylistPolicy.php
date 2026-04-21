<?php

namespace App\Policies;

use App\Models\Playlist;
use App\Models\User;

/**
 * PlaylistPolicy — Authorization rules for playlists.
 */
class PlaylistPolicy
{
    /**
     * Determine if user can view this playlist.
     */
    public function view(User $user, Playlist $playlist): bool
    {
        return $user->id === $playlist->user_id;
    }

    /**
     * Determine if user can update this playlist.
     */
    public function update(User $user, Playlist $playlist): bool
    {
        return $user->id === $playlist->user_id;
    }

    /**
     * Determine if user can delete this playlist.
     */
    public function delete(User $user, Playlist $playlist): bool
    {
        return $user->id === $playlist->user_id;
    }

    /**
     * Determine if user can add videos to this playlist.
     */
    public function addVideo(User $user, Playlist $playlist): bool
    {
        return $user->id === $playlist->user_id;
    }

    /**
     * Determine if user can remove videos from this playlist.
     */
    public function removeVideo(User $user, Playlist $playlist): bool
    {
        return $user->id === $playlist->user_id;
    }

    /**
     * Determine if user can reorder videos in this playlist.
     */
    public function reorderVideos(User $user, Playlist $playlist): bool
    {
        return $user->id === $playlist->user_id;
    }
}
