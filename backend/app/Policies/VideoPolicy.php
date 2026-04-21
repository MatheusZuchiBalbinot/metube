<?php

namespace App\Policies;

use App\Enums\VideoStatus;
use App\Models\User;
use App\Models\Video;

/**
 * VideoPolicy — Authorization rules for videos.
 */
class VideoPolicy
{
    /**
     * Determine if user can create a video.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine if user can view this video.
     */
    public function view(User $user, Video $video): bool
    {
        // Owner can view any status
        if ($user->id === $video->channel_id) {
            return true;
        }

        // Others can only view published videos
        return $video->status === VideoStatus::PUBLISHED;
    }

    /**
     * Determine if user can update this video.
     */
    public function update(User $user, Video $video): bool
    {
        return $user->id === $video->channel_id;
    }

    /**
     * Determine if user can delete this video.
     */
    public function delete(User $user, Video $video): bool
    {
        return $user->id === $video->channel_id;
    }
}
