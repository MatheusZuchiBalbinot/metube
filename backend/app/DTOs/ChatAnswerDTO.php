<?php

declare(strict_types=1);

namespace App\DTOs;

final readonly class ChatAnswerDTO
{
    public function __construct(
        public string $answer,
    ) {}
}
