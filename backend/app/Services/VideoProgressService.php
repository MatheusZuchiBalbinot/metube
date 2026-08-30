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
final class VideoProgressService
{
    public function updateProgress(User $user, Video $video, int $percent): void
    {
        DB::transaction(function () use ($user, $video, $percent) {
            $existing = $user->progress()
                ->forVideo($video->id)
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

            $isFinished = $percent >= 90 && $previousPercent < 90;

            if ($isFinished) {
                event(new VideoFinished($user, $video));

                return;
            }

            $isSkipped = $previousPercent > 0 && $percent < $previousPercent - 5;

            if (!$isSkipped) {
                return;
            }

            event(new VideoSkipped($user, $video, $percent));
        });
    }
}
