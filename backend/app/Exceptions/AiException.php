<?php

namespace App\Exceptions;

/**
 * Exception thrown by AI clients when API requests fail.
 */
class AiException extends \RuntimeException
{
    public function __construct(int $status, string $body)
    {
        parent::__construct("AI provider returned HTTP {$status}: {$body}");
    }
}
