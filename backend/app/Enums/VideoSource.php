<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * VideoSource — Surface from which the user interacted with a video.
 */
enum VideoSource: string
{
    case FEED = 'feed';
    case SEARCH = 'search';
    case CHANNEL = 'channel';
    case PLAYLIST = 'playlist';
    case RECOMMENDED = 'recommended';
    case HOME = 'home';
}
