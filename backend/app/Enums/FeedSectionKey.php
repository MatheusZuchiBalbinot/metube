<?php

declare(strict_types=1);

namespace App\Enums;

enum FeedSectionKey: string
{
    case SUBSCRIPTIONS = 'subscriptions';
    case TRENDING = 'trending';
    case RECENT = 'recent';
    case BECAUSE_YOU_WATCHED = 'because_you_watched';
    case SHORTS = 'shorts';
}
