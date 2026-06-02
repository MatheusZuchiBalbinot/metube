<?php

declare(strict_types=1);

namespace App\AI\Contracts;

use App\Exceptions\AiException;

/**
 * Interface for AI provider clients.
 *
 * Clients handle HTTP communication and response parsing.
 * Prompts encapsulate the request structure and parsing logic.
 */
interface AiClient
{
    /**
     * Execute a prompt against the AI provider.
     *
     * @param AiPrompt $prompt The prompt with request structure and parser
     *
     * @throws AiException On API errors
     *
     * @return mixed The parsed response (DTO or array)
     */
    public function execute(AiPrompt $prompt): mixed;
}
