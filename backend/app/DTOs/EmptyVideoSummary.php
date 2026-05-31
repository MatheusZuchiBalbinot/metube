<?php

declare(strict_types=1);

namespace App\DTOs;

final readonly class EmptyVideoSummary
{
    /** @var list<string> */
    public array $key_points;

    /** @var list<mixed> */
    public array $chapters;

    public string $reading_mode;

    public function __construct()
    {
        $this->key_points = [];
        $this->chapters = [];
        $this->reading_mode = '';
    }
}
