<?php

namespace App\Data;

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
