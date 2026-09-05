<?php

declare(strict_types=1);

namespace App\Services\Tus;

use App\Contracts\TusResolverContract;
use App\Support\CacheKeys;
use Illuminate\Support\Facades\Cache;
use TusPhp\Cache\RedisStore as TusRedisStore;

/**
 * Redis-backed implementation of {@see TusResolverContract}.
 *
 * Encapsulates the TusRedisStore construction, the server prefix convention
 * ('tus:server:', set by TusServer via reflection from its short name) and the
 * companion ownership cache entry written by the upload controller.
 */
final class TusUploadResolver implements TusResolverContract
{
    private readonly TusRedisStore $store;

    public function __construct()
    {
        $store = new TusRedisStore();
        $store->setPrefix('tus:server:');

        $this->store = $store;
    }

    public function get(string $key): ?array
    {
        $meta = $this->store->get($key);

        return \is_array($meta) ? $meta : null;
    }

    public function delete(string $key): void
    {
        $this->store->delete($key);
    }

    public function cacheOwner(string $key, int $userId, int $ttl): void
    {
        Cache::put(CacheKeys::tusOwner($key), $userId, $ttl);
    }

    public function clearOwnerCache(string $key): void
    {
        Cache::forget(CacheKeys::tusOwner($key));
    }

    public function getOwner(string $key): ?int
    {
        $ownerId = Cache::get(CacheKeys::tusOwner($key));

        return $ownerId !== null ? (int) $ownerId : null;
    }
}
