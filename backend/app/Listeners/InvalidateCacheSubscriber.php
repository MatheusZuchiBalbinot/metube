<?php

namespace App\Listeners;

use App\Events\ChannelSubscribed;
use App\Events\ChannelUnsubscribed;
use App\Events\PlaylistMutated;
use App\Events\VideoStatusUpdated;
use App\Events\VideoViewed;
use App\Services\CacheService;
use Illuminate\Events\Dispatcher;

/**
 * InvalidateCacheSubscriber — Event-driven cache invalidation.
 *
 * Subscribes to domain events and flushes the relevant cache keys/tags so that
 * services don't carry scattered `Cache::forget()` calls alongside their mutations.
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
            VideoViewed::class => 'onVideoViewed',
            PlaylistMutated::class => 'onPlaylistMutated',
            ChannelSubscribed::class => 'onChannelSubscribed',
            VideoStatusUpdated::class => 'onVideoStatusUpdated',
            ChannelUnsubscribed::class => 'onChannelUnsubscribed',
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
     * Flush all cached data for the video whose status changed.
     */
    public function onVideoStatusUpdated(VideoStatusUpdated $event): void
    {
        $this->cache->forgetVideo($event->video->vuid);
    }

    /**
     * Flush the playlist cache for the user whose playlists were mutated.
     */
    public function onPlaylistMutated(PlaylistMutated $event): void
    {
        $this->cache->forgetUserPlaylists($event->userId);
    }

    /**
     * Flush the history-events heatmap cache for the user who watched a video.
     */
    public function onVideoViewed(VideoViewed $event): void
    {
        $this->cache->forgetHistoryEvents($event->user->id);
    }
}
