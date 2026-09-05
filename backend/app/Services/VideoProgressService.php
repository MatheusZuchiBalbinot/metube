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
 */
final class VideoProgressService
{
    /** Watch percentage at or above which a video counts as "finished". */
    private const FINISH_THRESHOLD_PERCENT = 90;

    /** Minimum backward jump in percent to count as the user skipping ahead. */
    private const SKIP_BACK_TOLERANCE_PERCENT = 5;

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

            $isFinished = $percent >= self::FINISH_THRESHOLD_PERCENT
                && $previousPercent < self::FINISH_THRESHOLD_PERCENT;

            if ($isFinished) {
                event(new VideoFinished($user, $video));

                return;
            }

            $isSkipped = $previousPercent > 0
                && $percent < $previousPercent - self::SKIP_BACK_TOLERANCE_PERCENT;

            if (!$isSkipped) {
                return;
            }

            event(new VideoSkipped($user, $video, $percent));
        });
    }
}
