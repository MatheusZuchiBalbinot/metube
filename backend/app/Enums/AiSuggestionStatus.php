<?php

namespace App\Enums;

enum AiSuggestionStatus: string
{
    case PENDING = 'pending';
    case ACCEPTED = 'accepted';
    case DISMISSED = 'dismissed';
}
