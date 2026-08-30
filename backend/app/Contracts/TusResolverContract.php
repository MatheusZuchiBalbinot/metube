<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Abstracts access to the tus resumable-upload cache, hiding the concrete cache
 * backend and its key conventions from the upload service.
 */
interface TusResolverContract
{
    /**
     * @return array<string, mixed>|null Metadata array, or null when absent
     */
    public function get(string $key): ?array;

    public function delete(string $key): void;

    /**
     * @param int $ttl Cache lifetime in seconds
     */
    public function cacheOwner(string $key, int $userId, int $ttl): void;

    public function clearOwnerCache(string $key): void;

    /**
     * @return int|null Owner user ID, or null when no ownership entry exists
     *                  (never cached, expired, or already cleared)
     */
    public function getOwner(string $key): ?int;
}
