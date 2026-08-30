<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\TranscriptionResult;
use App\Enums\ApiTimeout;
use App\Exceptions\WhisperException;
use Illuminate\Support\Facades\Http;

class WhisperClient
{
    private readonly string $whisperUrl;

    private readonly int $timeout;

    public function __construct(
        ?string $whisperUrl = null,
        ?int $timeout = null,
    ) {
        $this->whisperUrl = $whisperUrl ?? config('services.whisper.url', 'http://whisper:8001');
        $this->timeout = $timeout ?? ApiTimeout::WHISPER_TRANSCRIBE->value;
    }

    /**
     * @throws WhisperException
     */
    public function transcribe(string $filePath): TranscriptionResult
    {
        return $this->call($filePath, 'transcribe');
    }

    /**
     * @throws WhisperException
     *
     * @return TranscriptionResult language is always "en"
     */
    public function translate(string $filePath): TranscriptionResult
    {
        return $this->call($filePath, 'translate');
    }

    /**
     * @param string $task "transcribe" or "translate"
     *
     * @throws WhisperException
     */
    private function call(string $filePath, string $task): TranscriptionResult
    {
        $response = Http::timeout($this->timeout)->post("{$this->whisperUrl}/transcribe", [
            'file_path' => $filePath,
            'task' => $task,
        ]);

        if (!$response->successful()) {
            throw new WhisperException($response->status(), $response->body());
        }

        return new TranscriptionResult(
            language: (string) $response->json('language'),
            text: (string) $response->json('text'),
            vtt: (string) $response->json('vtt'),
        );
    }
}
