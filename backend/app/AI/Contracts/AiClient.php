<?php

namespace App\AI\Contracts;

/**
 * Interface for AI provider clients (Gemini, Claude, etc).
 *
 * Clients handle HTTP communication and response parsing.
 * Prompts encapsulate the request structure and parsing logic.
 */
interface AiClient
{
    /**
     * Execute a prompt against the AI provider.
     *
     * @param  AiPrompt  $prompt  The prompt with request structure and parser
     * @return mixed The parsed response (DTO or array)
     *
     * @throws \App\Exceptions\AiException On API errors
     */
    public function execute(AiPrompt $prompt): mixed;
}
