<?php

declare(strict_types=1);

namespace App\Config;

/**
 * Standard pagination sizes for different content types.
 *
 * Centralized configuration for pagination to ensure consistency across services.
 */
final class PaginationSize
{
    public const VIDEO_LIST = 15;

    public const RECOMMENDATIONS = 15;

    public const USER_LIKES = 15;

    public const USER_HISTORY = 20;

    public const CHANNEL_VIDEOS = 50;

    public const COMMENT_LIST = 20;

    private function __construct() {}
}
