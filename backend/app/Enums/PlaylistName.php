<?php

namespace App\Enums;

/**
 * PlaylistName — Special playlist names enum.
 *
 * Values:
 * - WATCH_LATER: Watch Later playlist (auto-created for every user)
 */
enum PlaylistName: string
{
    case WATCH_LATER = 'Watch Later';

    /**
     * Get all available values as array.
     *
     * @return array<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
