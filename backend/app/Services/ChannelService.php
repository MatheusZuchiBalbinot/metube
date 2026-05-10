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
