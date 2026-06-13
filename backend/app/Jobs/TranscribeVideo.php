<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\TranscriptionStatus;
use App\Events\TranscriptionStatusUpdated;
use App\Events\VideoTranscriptionCompleted;
use App\Events\VideoTranscriptionStarted;
use App\Exceptions\WhisperException;
use App\Models\Video;
use App\Services\TranscriptionService;
use App\Services\VideoStorageService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Throwable;

class TranscribeVideo implements ShouldBeUnique, ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /** @var int Max seconds this job may run */
    public int $timeout = 3600;

    /** @var int Attempts before marking as failed */
    public int $tries = 3;

    /** @var int Seconds the uniqueness lock is held while the job is queued/running */
    public int $uniqueFor = 3600;

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
     * Ensure at most one transcription job per video is queued/running at a time.
     *
     * Guards against the double-transcription race: TranscodeVideoToHls is the single
     * dispatcher of this job, but the lock is an extra backstop in case anything else
     * (e.g. a manual retry) tries to enqueue a concurrent run for the same video.
     *
     * @return string Unique lock key derived from the video id
     */
    public function uniqueId(): string
    {
        return (string) $this->video->id;
    }

    /**
     * Orchestrate transcription: mark as processing, transcribe, mark as completed,
     * and dispatch AI metadata generation.
     *
     * When the source language is not English, a separate TranslateVideoCaptions job is dispatched
     * so the slower translate pass does not block the captions, transcription, and AI summary.
     *
     * @throws WhisperException If transcription fails
     */
    public function handle(TranscriptionService $service, VideoStorageService $storage): void
    {
        $video = Video::with('transcription')->find($this->video->id);

        if ($video === null) {
            Log::warning('TranscribeVideo: video not found', ['id' => $this->video->id]);

            return;
        }

        $audioPath = $video->audioPath();
        $isAudioMissing = !$storage->exists($audioPath);

        if ($isAudioMissing) {
            Log::warning('TranscribeVideo: audio file missing — was TranscodeVideoToHls completed?', [
                'vuid' => $video->vuid,
                'expected_path' => $audioPath,
            ]);

            return;
        }

        $isAlreadyDone = $video->transcription?->status === TranscriptionStatus::COMPLETED;

        if ($isAlreadyDone) {
            Log::info('TranscribeVideo: already completed, skipping', ['vuid' => $video->vuid]);

            return;
        }

        Log::info('TranscribeVideo: starting transcription', ['vuid' => $video->vuid, 'audio' => $audioPath]);

        $this->markProcessing($video);

        $service->transcribe($video);

        Log::info('TranscribeVideo: transcription done, dispatching AI metadata', ['vuid' => $video->vuid]);

        event(new VideoTranscriptionCompleted($video));
        dispatch(new GenerateAiMetadata($video));

        $video->refresh();
        $isNotEnglish = $video->transcription !== null && $video->transcription->language !== 'en';

        if (!$isNotEnglish) {
            return;
        }

        Log::info('TranscribeVideo: non-English detected, dispatching caption translation', [
            'vuid' => $video->vuid,
            'language' => $video->transcription->language,
        ]);

        dispatch(new TranslateVideoCaptions($video));
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

        // Note: We dispatch TranscriptionStatusUpdated for FAILED so listeners can react.
        // In future, we may create VideoTranscriptionFailed event if needed.
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

        if (!$isFirstAttempt) {
            return;
        }

        event(new VideoTranscriptionStarted($video, $startedAt, $estimatedSeconds));
    }
}
