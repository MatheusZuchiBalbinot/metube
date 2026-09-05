<?php

declare(strict_types=1);

namespace App\DTOs;

final readonly class TranscriptionResult
{
    public function __construct(
        public string $language,
        public string $text,
        public string $vtt,
    ) {}
}
