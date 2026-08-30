<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

class AiException extends RuntimeException
{
    public function __construct(int $status, string $body)
    {
        parent::__construct("AI provider returned HTTP {$status}: {$body}");
    }
}
