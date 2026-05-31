<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\TranscriptionStatus;
use App\Events\TranscriptionStatusUpdated;
use App\Models\Video;
use App\Services\TranscriptionService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Throwable;

class TranscribeVideo implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /** @var int Max seconds this job may run */
    public int $timeout = 3600;

    /** @var int Attempts before marking as failed */
    public int $tries = 3;

    /**
     * Estimated realtime factor for Whisper medium on CPU (seconds of audio per second of wall time).
     * A factor of 2.0 means 1 minute of audio takes ~30 seconds to transcribe.
     */
    public const SPEED_FACTOR = 2.0;

    /**
     * @param Video $video Published video to transcribe
     */
    public function __construct(private readonly Video $video)
    {
        $this->onQueue('transcription');
    }

    /**
     * Orchestrate transcription: mark as processing, transcribe, mark as completed, and dispatch AI metadata generation.
     *
     * When the source language is not English, a separate TranslateVideoCaptions job is dispatched
     * so the slower translate pass does not block the captions, transcription, and AI summary.
     *
     * @throws \App\Exceptions\WhisperException If transcription fails
     */
    public function handle(TranscriptionService $service): void
    {
        $video = Video::with('transcription')->find($this->video->id);

        if ($video === null || $video->video_url === null) {
            return;
        }

        $isAlreadyDone = $video->transcription?->status === TranscriptionStatus::COMPLETED;

        if ($isAlreadyDone) {
            return;
        }

        $this->markProcessing($video);

        $service->transcribe($video);

        event(new TranscriptionStatusUpdated($video, TranscriptionStatus::COMPLETED));
        dispatch(new GenerateAiMetadata($video));

        $video->refresh();
        $isNotEnglish = $video->transcription !== null && $video->transcription->language !== 'en';

        if ($isNotEnglish) {
            dispatch(new TranslateVideoCaptions($video));
        }
    }

    /**
     * Mark the transcription as failed when all retries are exhausted.
     */
    public function failed(Throwable $_): void
    {
        $video = Video::find($this->video->id);

        if ($video === null) {
            return;
        }

        $video->transcription()->updateOrCreate(
            [],
            ['status' => TranscriptionStatus::FAILED],
        );

        event(new TranscriptionStatusUpdated($video, TranscriptionStatus::FAILED));
    }

    /**
     * Mark transcription as processing and emit broadcast event with ETA.
     *
     * Only broadcasts on first attempt to avoid duplicate notifications.
     */
    private function markProcessing(Video $video): void
    {
        $startedAt = Carbon::now();
        $estimatedSeconds = $video->duration !== null ? round($video->duration / self::SPEED_FACTOR) : null;

        $video->transcription()->updateOrCreate(
            [],
            ['status' => TranscriptionStatus::PROCESSING, 'started_at' => $startedAt],
        );

        $isFirstAttempt = $this->attempts() === 1;

        if ($isFirstAttempt) {
            event(new TranscriptionStatusUpdated($video, TranscriptionStatus::PROCESSING, $startedAt, $estimatedSeconds));
        }
    }
}
