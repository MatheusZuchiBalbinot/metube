<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\ChannelSubscribed;
use App\Listeners\Traits\SendsQueuedNotifications;
use App\Notifications\NewSubscriberNotification;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;

class SendNewSubscriberNotification implements ShouldQueueAfterCommit
{
    use SendsQueuedNotifications;

    /**
     * Notify the channel owner when someone subscribes.
     */
    public function handle(ChannelSubscribed $event): void
    {
        if ($this->shouldSkipSelfNotification($event->subscriber, $event->channel)) {
            return;
        }

        $event->channel->notify(new NewSubscriberNotification($event->subscriber));
    }
}
