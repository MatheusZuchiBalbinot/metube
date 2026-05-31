<?php

namespace App\DTOs;

readonly class TranscriptionResult
{
    public function __construct(
        public string $language,
        public string $text,
        public string $vtt,
    ) {}
}
