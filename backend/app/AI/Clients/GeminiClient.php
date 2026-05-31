<?php

declare(strict_types=1);

namespace App\AI\Clients;

use App\AI\Contracts\AiClient;
use App\AI\Contracts\AiPrompt;
use App\Exceptions\AiException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

/**
 * Gemini AI provider client.
 *
 * Handles HTTP communication with Google's Gemini API.
 */
class GeminiClient implements AiClient
{
    /**
     * Execute a prompt against Gemini API.
     *
     * @param AiPrompt $prompt The prompt with request structure and parser
     *
     * @throws AiException On API errors
     *
     * @return mixed The parsed response from the prompt
     */
    public function execute(AiPrompt $prompt): mixed
    {
        $apiKey = config('services.gemini.api_key');
        $model = config('services.gemini.model', 'gemini-2.0-flash');

        try {
            $response = Http::timeout(60)->post(
                "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent",
                array_merge(
                    $prompt->buildRequest(),
                    ['key' => $apiKey],
                ),
            );

            if (!$response->successful()) {
                throw new AiException($response->status(), $response->body());
            }

            return $prompt->parse($response->json());
        } catch (RequestException $e) {
            throw new AiException($e->response->status(), $e->response->body());
        }
    }
}
