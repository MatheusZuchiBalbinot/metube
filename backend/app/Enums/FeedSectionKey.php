<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * FeedSectionKey — Identifies each shelf returned by the home feed endpoint.
 */
enum FeedSectionKey: string
{
    case SUBSCRIPTIONS = 'subscriptions';
    case TRENDING = 'trending';
    case RECENT = 'recent';
    case BECAUSE_YOU_WATCHED = 'because_you_watched';
    case SHORTS = 'shorts';
}
