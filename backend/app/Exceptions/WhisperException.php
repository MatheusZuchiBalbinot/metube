<?php

namespace App\Exceptions;

class WhisperException extends \RuntimeException
{
    public function __construct(int $status, string $body)
    {
        parent::__construct("Whisper returned HTTP {$status}: {$body}");
    }
}
