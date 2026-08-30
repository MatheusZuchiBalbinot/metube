<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Playlist;
use App\Models\User;

class PlaylistPolicy
{
    public function view(User $user, Playlist $playlist): bool
    {
        return $user->id === $playlist->user_id;
    }

    public function update(User $user, Playlist $playlist): bool
    {
        return $user->id === $playlist->user_id;
    }

    public function delete(User $user, Playlist $playlist): bool
    {
        return $user->id === $playlist->user_id;
    }

    public function addVideo(User $user, Playlist $playlist): bool
    {
        return $user->id === $playlist->user_id;
    }

    public function removeVideo(User $user, Playlist $playlist): bool
    {
        return $user->id === $playlist->user_id;
    }

    public function reorderVideos(User $user, Playlist $playlist): bool
    {
        return $user->id === $playlist->user_id;
    }
}
