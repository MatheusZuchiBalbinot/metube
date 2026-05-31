<?php

namespace App\Services;

use App\DTOs\TranscriptionResult;
use App\Exceptions\WhisperException;
use Illuminate\Support\Facades\Http;

class WhisperClient
{
    /**
     * Transcribe a video file via Whisper service.
     *
     * @param  string  $filePath  Path to the video file (or URL if Whisper accepts remote files)
     * @return TranscriptionResult Contains language, text, and VTT captions
     *
     * @throws WhisperException If the request fails
     */
    public function transcribe(string $filePath): TranscriptionResult
    {
        $whisperUrl = config('services.whisper.url', 'http://whisper:8001');

        $response = Http::timeout(3600)->post(
            "{$whisperUrl}/transcribe",
            ['file_path' => $filePath, 'task' => 'transcribe']
        );

        if (! $response->successful()) {
            throw new WhisperException($response->status(), $response->body());
        }

        return new TranscriptionResult(
            language: (string) $response->json('language'),
            text: (string) $response->json('text'),
            vtt: (string) $response->json('vtt'),
        );
    }
}
