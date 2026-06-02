<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\LanguageLabel;
use App\Enums\TranscriptionStatus;
use App\Exceptions\WhisperException;
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
}
