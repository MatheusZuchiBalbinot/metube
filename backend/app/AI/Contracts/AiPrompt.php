<?php

namespace App\AI\Contracts;

/**
 * Interface for AI prompts.
 *
 * Prompts encapsulate:
 * - The request structure (buildRequest() for HTTP payload)
 * - Response parsing (parse() to convert API response to DTO or array)
 */
interface AiPrompt
{
    /**
     * Build the request payload for the AI provider.
     *
     * @return array<string, mixed> The HTTP request body
     */
    public function buildRequest(): array;

    /**
     * Parse and validate the AI provider response.
     *
     * @param  array<string, mixed>  $response  Raw API response
     * @return mixed The parsed result (DTO, array, or other)
     *
     * @throws \RuntimeException If required keys are missing or invalid
     */
    public function parse(array $response): mixed;
}
