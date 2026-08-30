<?php

declare(strict_types=1);

namespace App\Enums;

enum PlaylistName: string
{
    /** Auto-created for every user in User::boot(); a reserved name. */
    case WATCH_LATER = 'Watch Later';

    /**
     * @return array<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
