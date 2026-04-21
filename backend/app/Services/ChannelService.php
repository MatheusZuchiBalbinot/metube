<?php

namespace App\Services;

use App\Models\User;

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
     * @param  User  $subscriber  User subscribing
     * @param  string  $uuid  Channel UUID
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function toggleSubscription(User $subscriber, string $uuid): void
    {
        $channel = User::byUuid($uuid)->firstOrFail();

        if ($subscriber->subscriptions()->where('channel_id', $channel->id)->exists()) {
            $subscriber->subscriptions()->detach($channel->id);
        } else {
            $subscriber->subscriptions()->attach($channel->id);
        }
    }
}
