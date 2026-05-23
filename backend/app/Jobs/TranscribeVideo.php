<?php

namespace App\Jobs;

use App\Enums\TranscriptionStatus;
use App\Events\TranscriptionStatusUpdated;
use App\Models\Transcription;
use App\Models\Video;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TranscribeVideo implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /** @var int Max seconds this job may run */
    public int $timeout = 3600;

    /** @var int Attempts before marking as failed */
    public int $tries = 3;

    /**
     * Estimated realtime factor for Whisper small on CPU (seconds of audio per second of wall time).
     * A factor of 5.0 means 1 minute of audio takes ~12 seconds to transcribe.
     */
    public const SPEED_FACTOR = 5.0;

    /**
     * @param  Video  $video  Published video to transcribe
     */
    public function __construct(private readonly Video $video)
    {
        $this->onQueue('transcription');
    }

    /**
     * Call the Whisper service and persist the transcription result.
     *
     * @throws ConnectionException
     */
    public function handle(): void
    {
        $video = Video::find($this->video->id);

        if ($video === null || $video->video_url === null) {
            return;
        }

        $startedAt = Carbon::now();
        $estimatedSeconds = $video->duration !== null
            ? round($video->duration / self::SPEED_FACTOR)
            : null;

        $transcription = Transcription::updateOrCreate(
            ['video_id' => $video->id],
            ['status' => TranscriptionStatus::PROCESSING, 'content' => null, 'language' => null, 'started_at' => $startedAt],
        );

        $video->loadMissing('channel');

        $isFirstAttempt = $this->attempts() === 1;
        if ($isFirstAttempt) {
            event(new TranscriptionStatusUpdated($video, TranscriptionStatus::PROCESSING, $startedAt, $estimatedSeconds));
        }

        $whisperUrl = config('services.whisper.url', 'http://whisper:8001');

        $response = Http::timeout(3600)->post("{$whisperUrl}/transcribe", [
            'file_path' => $video->video_url,
        ]);

        $isSuccess = $response->successful();

        if ($isSuccess) {
            $transcription->update([
                'status' => TranscriptionStatus::COMPLETED,
                'content' => $response->json('text'),
                'language' => $response->json('language'),
            ]);

            event(new TranscriptionStatusUpdated($video, TranscriptionStatus::COMPLETED));

            dispatch(new GenerateAiMetadata($video));
        } else {
            Log::error('Whisper transcription failed', [
                'vuid' => $video->vuid,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            $transcription->update(['status' => TranscriptionStatus::FAILED]);

            throw new \RuntimeException("Whisper returned HTTP {$response->status()} for video {$video->vuid}");
        }
    }

    /**
     * Mark the transcription as failed when all retries are exhausted.
     */
    public function failed(\Throwable $_): void
    {
        $video = Video::find($this->video->id);

        if ($video === null) {
            return;
        }

        Transcription::updateOrCreate(
            ['video_id' => $video->id],
            ['status' => TranscriptionStatus::FAILED],
        );

        event(new TranscriptionStatusUpdated($video, TranscriptionStatus::FAILED));
    }
}
