<?php

namespace App\Services;

use App\Enums\LanguageLabel;
use App\Models\Video;

class TranscriptionService
{
    /**
     * Transcribe a video and persist the transcription with original-language captions.
     *
     * @param  Video  $video  The video to transcribe
     *
     * @throws \App\Exceptions\WhisperException If transcription fails
     */
    public function transcribe(Video $video): void
    {
        if ($video->video_url === null) {
            return;
        }

        $result = $this->client->transcribe($video->video_url);

        $captionPath = $this->storage->publishCaption(
            $result->vtt, $video->vuid, $result->language
        );

        $video->update(['captions' => [[
            'lang' => $result->language,
            'label' => LanguageLabel::fromLangCode($result->language),
            'url' => $captionPath,
        ]]]);

        $video->transcription()->updateOrCreate([], [
            'status' => \App\Enums\TranscriptionStatus::COMPLETED,
            'content' => $result->text,
            'language' => $result->language,
        ]);
    }

    public function __construct(
        private WhisperClient $client,
        private VideoStorageService $storage,
    ) {}
}
