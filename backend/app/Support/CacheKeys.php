<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Single source of truth for ad-hoc Cache/Redis key formats used outside
 * CacheService's named cache groups — tus upload bookkeeping and the view
 * throttle. Keeping the format in one place makes every usage of a given
 * key greppable and prevents call sites drifting out of sync with each other.
 */
final class CacheKeys
{
    public static function tusOwner(string $uploadKey): string
    {
        return "tus:owner:{$uploadKey}";
    }

    public static function tusQuota(int $userId): string
    {
        return "tus:quota:{$userId}";
    }

    public static function tusFinalizeLock(string $uploadKey): string
    {
        return "tus:finalize:{$uploadKey}";
    }

    public static function viewThrottle(int $videoId, int $userId): string
    {
        return "views:throttle:{$videoId}:{$userId}";
    }
}
