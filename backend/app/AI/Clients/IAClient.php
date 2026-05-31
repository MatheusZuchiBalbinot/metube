<?php

namespace App\AI\Clients;

use App\AI\Contracts\AiClient;
use App\AI\Contracts\AiPrompt;
use App\Services\IAService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;

/**
 * AI client using IAService (Groq/OpenAI-compatible).
 *
 * Implements the AiClient contract by wrapping IAService::generate().
 * This adapter decouples jobs and services from the specific IAService implementation.
 */
class IAClient implements AiClient
{
    public function __construct(private readonly IAService $service) {}

    /**
     * Execute a prompt against the AI service and return parsed result.
     *
     * @param  AiPrompt  $prompt  The prompt to execute
     * @return mixed The prompt's parse() result
     *
     * @throws ConnectionException
     * @throws RequestException
     * @throws \RuntimeException When validation fails
     */
    public function execute(AiPrompt $prompt): mixed
    {
        $raw = $this->service->generate($prompt->build());

        $this->validate($raw, $prompt->requiredKeys());

        return $prompt->parse($raw);
    }

    /**
     * Validate that all required keys are present in the response.
     *
     * @param  array<string, mixed>  $raw
     * @param  string[]  $required
     *
     * @throws \RuntimeException
     */
    private function validate(array $raw, array $required): void
    {
        foreach ($required as $key) {
            $isMissing = ! array_key_exists($key, $raw);
            if ($isMissing) {
                throw new \RuntimeException("AI response missing required key '{$key}'");
            }
        }
    }
}
