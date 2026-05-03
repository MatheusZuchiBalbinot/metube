<?php

namespace App\Services;

use App\Events\ChannelSubscribed;
use App\Events\ChannelUnsubscribed;
use App\Models\User;
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
    /**
     * Toggle subscription to a channel.
     *
     * Emits ChannelSubscribed / ChannelUnsubscribed for the analytics pipeline.
     *
     * @param  User  $subscriber  User subscribing
     * @param  string  $uuid  Channel UUID
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function toggleSubscription(User $subscriber, string $uuid): void
    {
        $channel = User::byUuid($uuid)->firstOrFail();

        DB::transaction(function () use ($subscriber, $channel) {
            $isAlreadySubscribed = $subscriber->subscriptions()->where('channel_id', $channel->id)->exists();

            if ($isAlreadySubscribed) {
                $subscriber->subscriptions()->detach($channel->id);
                event(new ChannelUnsubscribed($subscriber, $channel));

                return;
            }

            $subscriber->subscriptions()->attach($channel->id);
            event(new ChannelSubscribed($subscriber, $channel));
        });
    }
}
