<?php

declare(strict_types=1);

namespace App\Services\Tus;

use App\Config\UploadLimits;
use App\Support\CacheKeys;
use Illuminate\Contracts\Redis\Factory as RedisFactory;
use Illuminate\Support\Facades\Log;
use RedisException;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Tracks each user's total declared size across concurrent, not-yet-finalized
 * tus sessions, rejecting a new one that would exceed
 * {@see UploadLimits::TUS_USER_QUOTA_BYTES} — a per-file cap alone doesn't
 * bound aggregate disk use from many abandoned sessions.
 *
 * The reservation is a Redis counter ({@see CacheKeys::tusQuota()}) sharing
 * the tus session TTL, so an abandoned one self-expires with no separate
 * cleanup job.
 */
final class TusQuotaService
{
    public function __construct(private readonly RedisFactory $redis) {}

    /**
     * Fails open on a Redis outage — this is a DoS mitigation, not a security
     * boundary, so the upload proceeds unmetered rather than hard-failing.
     *
     * @throws HttpException 413 when the reservation would exceed the user's quota
     */
    public function reserve(int $userId, int $bytes): void
    {
        try {
            $conn = $this->redis->connection();
            $key = CacheKeys::tusQuota($userId);

            // INCRBY first and check the result, instead of GET-then-compare-
            // then-INCRBY — otherwise two concurrent reservations could both
            // read the same pre-increment value and both pass the check.
            $total = (int) $conn->command('incrby', [$key, $bytes]);
            $wouldExceedQuota = $total > UploadLimits::TUS_USER_QUOTA_BYTES;

            if ($wouldExceedQuota) {
                $conn->command('decrby', [$key, $bytes]);

                throw new HttpException(413, 'Upload quota exceeded — finish or cancel an in-progress upload first.');
            }

            $conn->command('expire', [$key, (int) config('tus.ttl')]);
        } catch (RedisException $e) {
            Log::warning('TusQuotaService: reserve failed, proceeding unmetered', [
                'user_id' => $userId,
                'exception' => $e->getMessage(),
            ]);
        }
    }

    /** Frees a reservation early (upload finalized) instead of waiting out the TTL. Fails soft, see reserve(). */
    public function release(int $userId, int $bytes): void
    {
        try {
            $conn = $this->redis->connection();
            $key = CacheKeys::tusQuota($userId);

            $remaining = (int) $conn->command('decrby', [$key, $bytes]);

            $isDepletedOrNegative = $remaining <= 0;

            if ($isDepletedOrNegative) {
                $conn->command('del', [$key]);
            }
        } catch (RedisException $e) {
            Log::warning('TusQuotaService: release failed', [
                'user_id' => $userId,
                'exception' => $e->getMessage(),
            ]);
        }
    }
}
