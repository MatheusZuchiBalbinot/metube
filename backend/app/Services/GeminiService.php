<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

/**
 * GeminiService — Thin wrapper around the Gemini REST API.
 *
 * Uses generateContent with responseMimeType=application/json so the model
 * always returns structured JSON we can decode directly.
 */
class GeminiService
{
    private string $apiKey;

    private string $model;

    private string $baseUrl;

    public function __construct()
    {
        $this->apiKey = (string) config('services.gemini.key');
        $this->model = (string) config('services.gemini.model', 'gemini-2.0-flash');
        $this->baseUrl = (string) config('services.gemini.url', 'https://generativelanguage.googleapis.com/v1beta/models');
    }

    /**
     * Send a prompt and return the parsed JSON response body.
     *
     * @param  string  $prompt  Full prompt text to send
     * @return array<string, mixed> Decoded JSON from the model's first candidate
     *
     * @throws ConnectionException When the API is unreachable
     * @throws RequestException When the API returns a non-2xx response
     * @throws \RuntimeException When the response cannot be decoded as JSON
     */
    public function generate(string $prompt): array
    {
        $url = "{$this->baseUrl}/{$this->model}:generateContent";

        $response = Http::withToken($this->apiKey)
            ->timeout(60)
            ->post($url, [
                'contents' => [
                    ['parts' => [['text' => $prompt]]],
                ],
                'generationConfig' => [
                    'responseMimeType' => 'application/json',
                ],
            ])
            ->throw();

        $text = $response->json('candidates.0.content.parts.0.text');

        $isTextMissing = ! is_string($text) || $text === '';
        if ($isTextMissing) {
            throw new \RuntimeException('Gemini returned an empty response.');
        }

        /** @var array<string, mixed>|null $decoded */
        $decoded = json_decode($text, true);

        $isInvalidJson = ! is_array($decoded);
        if ($isInvalidJson) {
            throw new \RuntimeException('Gemini response is not valid JSON: '.$text);
        }

        return $decoded;
    }
}
