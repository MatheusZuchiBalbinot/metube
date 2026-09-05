<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\TranscriptionStatus;
use App\Models\User;
use App\Models\Video;

class VideoPolicy
{
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Guests (null user) may only view published videos.
     */
    public function view(?User $user, Video $video): bool
    {
        if ($user === null) {
            return $video->status->isPublic();
        }

        $isOwner = $user->id === $video->channel_id;

        if ($isOwner) {
            return true;
        }

        return $video->status->isPublic();
    }

    public function update(User $user, Video $video): bool
    {
        return $user->id === $video->channel_id;
    }

    public function delete(User $user, Video $video): bool
    {
        return $user->id === $video->channel_id;
    }

    public function retryTranscription(User $user, Video $video): bool
    {
        if ($user->id !== $video->channel_id) {
            return false;
        }

        return $video->loadMissing('transcription')->transcription?->status === TranscriptionStatus::FAILED;
    }

    public function manageSuggestion(User $user, Video $video): bool
    {
        return $user->id === $video->channel_id;
    }

    /**
     * Ownership check only — status validation (draft-only) is the
     * controller's responsibility and returns 409 rather than 403.
     */
    public function publish(User $user, Video $video): bool
    {
        return $user->id === $video->channel_id;
    }
}
