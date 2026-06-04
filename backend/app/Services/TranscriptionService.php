<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\LanguageLabel;
use App\Enums\TranscriptionStatus;
use App\Exceptions\WhisperException;
use App\Jobs\TranscribeVideo;
use App\Models\Transcription;
use App\Models\Video;

final class TranscriptionService
{
    public function __construct(
        private readonly WhisperClient $client,
        private readonly VideoStorageService $storage,
    ) {}

    /**
     * Transcribe a video and persist the transcription with original-language captions.
     *
     * @param Video $video The video to transcribe
     *
     * @throws WhisperException If transcription fails
     */
    public function transcribe(Video $video): void
    {
        $audioPath = $video->audioPath();
        $isAudioMissing = !$this->storage->exists($audioPath);

        if ($isAudioMissing) {
            return;
        }

        $result = $this->client->transcribe($audioPath);

        $captionPath = $this->storage->publishCaption(
            $result->vtt,
            $video->vuid,
            $result->language,
        );

        $caption = [
            'lang' => $result->language,
            'label' => LanguageLabel::fromLangCode($result->language),
            'url' => $captionPath,
        ];
        $videoUpdatePayload = ['captions' => [$caption]];
        $video->update($videoUpdatePayload);

        $transcriptionPayload = [
            'status' => TranscriptionStatus::COMPLETED,
            'content' => $result->text,
            'vtt' => $result->vtt,
            'language' => $result->language,
        ];
        $video->transcription()->updateOrCreate([], $transcriptionPayload);
    }

    /**
     * Get the transcription for a video, if one exists.
     *
     * @param Video $video Video to look up
     *
     * @return Transcription|null The transcription record, or null when not started yet
     */
    public function findForVideo(Video $video): ?Transcription
    {
        return $video->transcription()->with('video')->first();
    }

    /**
     * Reset a failed or stuck transcription so it can be re-attempted.
     *
     * Resets the record to PENDING and clears content and language so the next
     * run starts fresh, then dispatches TranscribeVideo to queue the work.
     *
     * @param Video $video Video whose transcription should be retried
     */
    public function resetForRetry(Video $video): void
    {
        Transcription::updateOrCreate(
            ['video_id' => $video->id],
            ['status' => TranscriptionStatus::PENDING, 'content' => null, 'language' => null],
        );

        dispatch(new TranscribeVideo($video));
    }
}
