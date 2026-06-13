<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\PaginationSize;
use App\Events\ChannelSubscribed;
use App\Events\ChannelUnsubscribed;
use App\Models\User;
use App\Models\UserSubscription;
use App\Models\Video;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

/**
 * ChannelService — Business logic for channels.
 *
 * Responsible for:
 * - Subscription management (coordination logic)
 * - Complex channel operations
 */
final class ChannelService
{
    public function __construct(private readonly CacheService $cache) {}

    /**
     * Get a channel (user) by public UUID.
     *
     * @param string $uuid User UUID (v4)
     *
     * @throws ModelNotFoundException
     *
     * @return User Channel user
     */
    public function getByUuid(string $uuid): User
    {
        return $this->cache->rememberChannelInfo(
            $uuid,
            fn () => User::byUuid($uuid)->firstOrFail(),
        );
    }

    /**
     * Get paginated videos for a channel.
     *
     * When $includeAllStatuses is true, returns every status (processing, failed, draft, etc.)
     * ordered by recency — used when the channel owner is viewing their own page.
     * Otherwise returns only published videos in newest-published order (cached per page).
     *
     * @param User $channel Channel to list videos for
     * @param bool $includeAllStatuses Whether to include non-published videos (owner view)
     * @param int $page Page number used as the per-page cache key for published videos
     *
     * @return LengthAwarePaginator<Video>
     */
    public function listVideos(User $channel, bool $includeAllStatuses = false, int $page = 1): LengthAwarePaginator
    {
        $query = $channel->videos()->with('channel');

        if ($includeAllStatuses) {
            return $query->latest()->paginate(PaginationSize::CHANNEL_VIDEOS);
        }

        return $this->cache->rememberChannelVideos(
            $channel->uuid,
            $page,
            fn () => $query->published()->newestPublished()->paginate(
                perPage: PaginationSize::VIDEO_LIST,
                page: $page,
            ),
        );
    }

    /**
     * Toggle subscription to a channel.
     *
     * Emits ChannelSubscribed / ChannelUnsubscribed for the analytics pipeline.
     *
     * @param User $subscriber User subscribing
     * @param string $uuid Channel UUID
     *
     * @throws ModelNotFoundException
     */
    public function toggleSubscription(User $subscriber, string $uuid): void
    {
        $channel = User::byUuid($uuid)->firstOrFail();

        DB::transaction(function () use ($subscriber, $channel) {
            $unsubscribed = UserSubscription::query()
                ->fromUserToChannel($subscriber->id, $channel->id)
                ->delete();

            if ($unsubscribed > 0) {
                event(new ChannelUnsubscribed($subscriber, $channel));

                return;
            }

            $subscriptionData = [
                'user_id' => $subscriber->id,
                'channel_id' => $channel->id,
            ];
            $inserted = UserSubscription::query()->insertOrIgnore($subscriptionData);

            if ($inserted === 0) {
                return;
            }

            event(new ChannelSubscribed($subscriber, $channel));
        });
    }
}
