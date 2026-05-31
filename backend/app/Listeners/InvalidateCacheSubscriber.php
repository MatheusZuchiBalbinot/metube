<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\ChannelSubscribed;
use App\Events\ChannelUnsubscribed;
use App\Events\VideoViewed;
use App\Services\CacheService;
use Illuminate\Events\Dispatcher;

/**
 * InvalidateCacheSubscriber — Event-driven cache invalidation for raw-DB operations.
 *
 * Handles only events that arise from raw DB queries, where Eloquent model
 * observers cannot intercept the change:
 *   - Channel subscriptions (DB::table('user_subscriptions') in ChannelService)
 *   - Watch history (DB::table('watch_histories')->insertOrIgnore in VideoService)
 *
 * All other cache invalidation is handled by VideoObserver, PlaylistObserver,
 * and UserObserver reacting to standard Eloquent model events.
 */
class InvalidateCacheSubscriber
{
    public function __construct(private readonly CacheService $cache) {}

    /**
     * Register all event listeners for this subscriber.
     *
     * @return array<class-string, string>
     */
    public function subscribe(Dispatcher $events): array
    {
        return [
            ChannelSubscribed::class => 'onChannelSubscribed',
            ChannelUnsubscribed::class => 'onChannelUnsubscribed',
            VideoViewed::class => 'onVideoViewed',
        ];
    }

    /**
     * Flush channel info (subscriber count changed) and the subscriber's cached subscription list.
     */
    public function onChannelSubscribed(ChannelSubscribed $event): void
    {
        $this->cache->forgetChannel($event->channel->uuid);
        $this->cache->forgetUserSubscriptions($event->subscriber->id);
    }

    /**
     * Flush channel info (subscriber count changed) and the subscriber's cached subscription list.
     */
    public function onChannelUnsubscribed(ChannelUnsubscribed $event): void
    {
        $this->cache->forgetChannel($event->channel->uuid);
        $this->cache->forgetUserSubscriptions($event->subscriber->id);
    }

    /**
     * Flush the history-events heatmap cache for the user who just watched a video.
     *
     * VideoService uses insertOrIgnore (raw DB), so no WatchHistory model event fires —
     * this subscriber bridges that gap via the VideoViewed domain event.
     */
    public function onVideoViewed(VideoViewed $event): void
    {
        $this->cache->forgetHistoryEvents($event->user->id);
    }
}
