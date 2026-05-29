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
     *
     * Guests (null user) may only view published videos.
     */
    public function view(?User $user, Video $video): bool
    {
        if ($user === null) {
            return $video->status === VideoStatus::PUBLISHED;
        }

        // Owner can view any status
        $isOwner = $user->id === $video->channel_id;
        if ($isOwner) {
            return true;
        }

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

    /**
     * Determine if user can retry the transcription for this video.
     */
    public function retryTranscription(User $user, Video $video): bool
    {
        return $user->id === $video->channel_id;
    }

    /**
     * Determine if user can accept/dismiss AI suggestions for this video.
     */
    public function manageSuggestion(User $user, Video $video): bool
    {
        return $user->id === $video->channel_id;
    }
}
