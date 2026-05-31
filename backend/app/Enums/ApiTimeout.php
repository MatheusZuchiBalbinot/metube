<?php

declare(strict_types=1);

namespace App\Enums;

enum ApiTimeout: int
{
    case WHISPER_TRANSCRIBE = 3600;
    case GEMINI_GENERATE = 60;
    case CHAT_COMPLETION = 30;
}
