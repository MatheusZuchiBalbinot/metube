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
     * Retrieve the stored metadata for an upload key.
     *
     * @param string $key The tus upload key
     *
     * @return array<string, mixed>|null Metadata array, or null when absent
     */
    public function get(string $key): ?array;

    /**
     * Remove the stored metadata for an upload key.
     *
     * @param string $key The tus upload key
     */
    public function delete(string $key): void;

    /**
     * Cache the authenticated user as the owner of an upload session.
     *
     * @param string $key The tus upload key
     * @param int $userId Authenticated user ID
     * @param int $ttl Cache lifetime in seconds
     */
    public function cacheOwner(string $key, int $userId, int $ttl): void;

    /**
     * Forget the ownership cache entry associated with an upload key.
     *
     * @param string $key The tus upload key
     */
    public function clearOwnerCache(string $key): void;
}
