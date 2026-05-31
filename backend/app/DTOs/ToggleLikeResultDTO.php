<?php

declare(strict_types=1);

namespace App\DTOs;

final readonly class ToggleLikeResultDTO
{
    public function __construct(
        public bool $liked,
        public int $likesCount,
    ) {}
}
