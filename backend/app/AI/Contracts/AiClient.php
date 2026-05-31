<?php

namespace App\AI\Contracts;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;

/**
 * Interface for AI service clients — executes any prompt.
 *
 * Implementations are specific to an AI provider (Groq, OpenAI, Anthropic, etc)
 * but all speak the same language: they execute AiPrompt instances and return
 * typed results. Switching providers requires only changing the binding in
 * AppServiceProvider.
 */
interface AiClient
{
    /**
     * Execute a prompt and return its parsed result.
     *
     * @param  AiPrompt  $prompt  The prompt to execute
     * @return mixed The prompt's parse() result
     *
     * @throws ConnectionException When the AI service is unreachable
     * @throws RequestException When the AI service returns an error
     * @throws \RuntimeException When response validation fails
     */
    public function execute(AiPrompt $prompt): mixed;
}
