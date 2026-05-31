<?php

declare(strict_types=1);

namespace App\Services;

use App\Events\VideoFinished;
use App\Events\VideoSkipped;
use App\Models\User;
use App\Models\Video;
use Illuminate\Support\Facades\DB;

/**
 * VideoProgressService — Tracks user watch progress for videos.
 *
 * Responsible for:
 * - Updating watch progress percentage
 * - Detecting video completion
 * - Dispatching relevant viewing events
 */
class VideoProgressService
{
    /**
     * Update watch progress for a video.
     *
     * Tracks the percentage watched and detects finish/skip events based
     * on progress changes.
     *
     * @param User $user Authenticated user
     * @param Video $video Video being watched
     * @param int $percent Watch progress percentage (0-100)
     */
    public function updateProgress(User $user, Video $video, int $percent): void
    {
        DB::transaction(function () use ($user, $video, $percent) {
            $existing = $user->progress()
                ->where('video_id', $video->id)
                ->lockForUpdate()
                ->first();

            $previousPercent = $existing !== null ? $existing->percent : 0;

            $updateData = [
                'percent' => $percent,
                'updated_at' => now(),
            ];
            $user->progress()->updateOrCreate(
                ['video_id' => $video->id],
                $updateData,
            );

            // User finished the video (reached 90%+)
            $isFinished = $percent >= 90 && $previousPercent < 90;

            if ($isFinished) {
                event(new VideoFinished($user, $video));

                return;
            }

            // User skipped (stopped watching, went backwards, or low progress)
            $isSkipped = $previousPercent > 0 && $percent < $previousPercent - 5;

            if ($isSkipped) {
                event(new VideoSkipped($user, $video, $percent));
            }
        });
    }
}
