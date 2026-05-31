<?php

declare(strict_types=1);

namespace App\Enums;

enum AiSuggestionStatus: string
{
    case PENDING = 'pending';
    case ACCEPTED = 'accepted';
    case DISMISSED = 'dismissed';
}
