<?php

declare(strict_types=1);

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * Thrown when the AI provider returns a payload that cannot be parsed into the
 * expected structure: malformed JSON, a missing required key, or an empty body.
 *
 * The detailed message (which may embed the raw provider response) is preserved
 * for server-side logs, while render() returns a generic message so internal
 * provider output is never leaked to API clients.
 */
class InvalidAiResponseException extends RuntimeException
{
    private function __construct(string $message)
    {
        parent::__construct($message);
    }

    /**
     * The response body could not be decoded as JSON.
     *
     * @param string $raw Raw provider response (kept for logs only)
     */
    public static function invalidJson(string $raw): self
    {
        return new self('AI service response is not valid JSON: ' . $raw);
    }

    /**
     * A key required by the prompt is absent from the decoded response.
     *
     * @param string $key The missing key
     */
    public static function missingKey(string $key): self
    {
        return new self("AI response missing required key '{$key}'");
    }

    /**
     * The provider returned a successful status but an empty content body.
     */
    public static function empty(): self
    {
        return new self('AI service returned an empty response.');
    }

    /**
     * Render a client-safe response for API requests, hiding provider internals.
     *
     * @param Request $request The incoming request
     *
     * @return JsonResponse|false A JSON response for api/* requests, false otherwise
     */
    public function render(Request $request): JsonResponse|false
    {
        if (!$request->is('api/*')) {
            return false;
        }

        return response()->json(['message' => 'The AI service returned an unexpected response.'], 502);
    }
}
