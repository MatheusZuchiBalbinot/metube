<?php

declare(strict_types=1);

namespace App\AI\Contracts;

use App\Exceptions\AiException;
use App\Exceptions\InvalidAiResponseException;
use Illuminate\Http\Client\RequestException;

/**
 * Clients handle HTTP communication and response parsing;
 * prompts encapsulate the request structure and parsing logic.
 */
interface AiClient
{
    /**
     * @throws AiException On API errors
     *
     * @return mixed The parsed response (DTO or array)
     */
    public function execute(AiPrompt $prompt): mixed;

    /**
     * @param array<int, array{role: string, content: string}> $history Previous turns
     *
     * @throws RequestException When the API returns a non-2xx response
     * @throws InvalidAiResponseException When the response content is missing
     */
    public function chat(string $question, string $systemPrompt, array $history): string;
}
