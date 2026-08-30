<?php

declare(strict_types=1);

namespace App\Enums;

enum VideoSource: string
{
    case FEED = 'feed';
    case SEARCH = 'search';
    case CHANNEL = 'channel';
    case PLAYLIST = 'playlist';
    case RECOMMENDED = 'recommended';
    case HOME = 'home';
}
