<?php

namespace App\Jobs;

use App\Enums\TranscriptionStatus;
use App\Events\TranscriptionStatusUpdated;
use App\Models\Transcription;
use App\Models\Video;
use App\Services\VideoStorageService;
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
     * Estimated realtime factor for Whisper medium on CPU (seconds of audio per second of wall time).
     * A factor of 2.0 means 1 minute of audio takes ~30 seconds to transcribe.
     */
    public const SPEED_FACTOR = 2.0;

    /**
     * @param  Video  $video  Published video to transcribe
     */
    public function __construct(private readonly Video $video)
    {
        $this->onQueue('transcription');
    }

    /**
     * Call the Whisper service, persist the transcription, and generate the original VTT caption file.
     *
     * Only the original-language pass runs here. When the source language is not English,
     * a separate TranslateVideoCaptions job is dispatched so the slower translate pass does
     * not block the captions, transcription, and AI summary from becoming available.
     *
     * @throws ConnectionException
     */
    public function handle(VideoStorageService $storage): void
    {
        $video = Video::find($this->video->id);

        if ($video === null || $video->video_url === null) {
            return;
        }

        $video->loadMissing('transcription');
        $isAlreadyDone = $video->transcription !== null && $video->transcription->status === TranscriptionStatus::COMPLETED;

        if ($isAlreadyDone) {
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

        $transcribeResponse = Http::timeout(3600)->post("{$whisperUrl}/transcribe", [
            'file_path' => $video->video_url,
            'task' => 'transcribe',
        ]);

        $isSuccess = $transcribeResponse->successful();

        if (! $isSuccess) {
            Log::error('Whisper transcription failed', [
                'vuid' => $video->vuid,
                'status' => $transcribeResponse->status(),
                'body' => $transcribeResponse->body(),
            ]);

            $transcription->update(['status' => TranscriptionStatus::FAILED]);

            throw new \RuntimeException("Whisper returned HTTP {$transcribeResponse->status()} for video {$video->vuid}");
        }

        $detectedLang = (string) $transcribeResponse->json('language');
        $plainText = (string) $transcribeResponse->json('text');
        $originalVtt = (string) $transcribeResponse->json('vtt');

        $originalCaptionPath = $storage->publishCaption($originalVtt, $video->vuid, $detectedLang);

        $video->update(['captions' => [
            [
                'lang' => $detectedLang,
                'label' => $this->languageLabel($detectedLang),
                'url' => $originalCaptionPath,
            ],
        ]]);

        $transcription->update([
            'status' => TranscriptionStatus::COMPLETED,
            'content' => $plainText,
            'language' => $detectedLang,
        ]);

        event(new TranscriptionStatusUpdated($video, TranscriptionStatus::COMPLETED));

        dispatch(new GenerateAiMetadata($video));

        $isNotEnglish = $detectedLang !== 'en';
        if ($isNotEnglish) {
            dispatch(new TranslateVideoCaptions($video));
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

    /**
     * Return a human-readable language label for a BCP-47 code.
     */
    private function languageLabel(string $lang): string
    {
        return match ($lang) {
            'pt' => 'Português',
            'en' => 'English',
            'es' => 'Español',
            'fr' => 'Français',
            'de' => 'Deutsch',
            'it' => 'Italiano',
            'ja' => '日本語',
            'zh' => '中文',
            'ko' => '한국어',
            'ru' => 'Русский',
            'ar' => 'العربية',
            default => strtoupper($lang),
        };
    }
}
