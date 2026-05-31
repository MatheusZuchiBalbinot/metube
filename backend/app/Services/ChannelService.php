<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\PaginationSize;
use App\Events\ChannelSubscribed;
use App\Events\ChannelUnsubscribed;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

/**
 * ChannelService — Business logic for channels.
 *
 * Responsible for:
 * - Subscription management (coordination logic)
 * - Complex channel operations
 */
class ChannelService
{
    public function __construct(private readonly CacheService $cache) {}

    /**
     * Get a channel (user) by public UUID.
     *
     * @param string $uuid User UUID (v4)
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
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
     *
     * @return LengthAwarePaginator<\App\Models\Video>
     */
    public function listVideos(User $channel, bool $includeAllStatuses = false): LengthAwarePaginator
    {
        $query = $channel->videos()->with('channel');

        if ($includeAllStatuses) {
            return $query->latest()->paginate(PaginationSize::CHANNEL_VIDEOS);
        }

        $page = (int) request()->query('page', '1');

        return $this->cache->rememberChannelVideos(
            $channel->uuid,
            $page,
            fn () => $query->published()->newestPublished()->paginate(PaginationSize::VIDEO_LIST),
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
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function toggleSubscription(User $subscriber, string $uuid): void
    {
        $channel = User::byUuid($uuid)->firstOrFail();

        DB::transaction(function () use ($subscriber, $channel) {
            $unsubscribed = DB::table('user_subscriptions')
                ->where('user_id', $subscriber->id)
                ->where('channel_id', $channel->id)
                ->delete();

            if ($unsubscribed > 0) {
                event(new ChannelUnsubscribed($subscriber, $channel));

                return;
            }

            $inserted = DB::table('user_subscriptions')->insertOrIgnore([
                'user_id' => $subscriber->id,
                'channel_id' => $channel->id,
            ]);

            if ($inserted > 0) {
                event(new ChannelSubscribed($subscriber, $channel));
            }
        });
    }
}
