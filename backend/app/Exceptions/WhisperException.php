<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

class WhisperException extends RuntimeException
{
    public function __construct(int $status, string $body)
    {
        parent::__construct("Whisper returned HTTP {$status}: {$body}");
    }
}
