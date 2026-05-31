<?php

declare(strict_types=1);

namespace App\Enums;

enum TranscriptionLimit: int
{
    case MAX_CHARS_FOR_CHAT = 8000;
}
