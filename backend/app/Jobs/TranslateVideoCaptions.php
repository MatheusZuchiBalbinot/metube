<?php

namespace App\Jobs;

use App\Models\Video;
use App\Services\VideoStorageService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Generate English caption track for a non-English video via Whisper's translate task.
 *
 * Runs after TranscribeVideo so the original-language captions and AI summary are
 * available immediately; the English translation is appended to the video's caption
 * list once this slower second Whisper pass completes.
 */
class TranslateVideoCaptions implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /** @var int Max seconds this job may run */
    public int $timeout = 3600;

    /** @var int Attempts before giving up */
    public int $tries = 3;

    /**
     * @param  Video  $video  Published video whose original transcription is complete
     */
    public function __construct(private readonly Video $video)
    {
        $this->onQueue('transcription');
    }

    /**
     * Call Whisper in translate mode and append the English caption track to the video.
     *
     * @throws ConnectionException
     */
    public function handle(VideoStorageService $storage): void
    {
        $video = Video::find($this->video->id);

        if ($video === null || $video->video_url === null) {
            return;
        }

        $existingCaptions = $video->captions ?? [];
        $hasEnglishAlready = in_array('en', array_column($existingCaptions, 'lang'), true);
        if ($hasEnglishAlready) {
            return;
        }

        $whisperUrl = config('services.whisper.url', 'http://whisper:8001');

        $response = Http::timeout(3600)->post("{$whisperUrl}/transcribe", [
            'file_path' => $video->video_url,
            'task' => 'translate',
        ]);

        if (! $response->successful()) {
            Log::warning('Whisper translation to English failed, leaving video without English captions', [
                'vuid' => $video->vuid,
                'status' => $response->status(),
            ]);

            return;
        }

        $englishVtt = (string) $response->json('vtt');
        $englishCaptionPath = $storage->publishCaption($englishVtt, $video->vuid, 'en');

        $existingCaptions[] = [
            'lang' => 'en',
            'label' => 'English',
            'url' => $englishCaptionPath,
        ];

        $video->update(['captions' => $existingCaptions]);
    }
}
