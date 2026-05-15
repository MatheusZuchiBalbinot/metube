<?php

namespace App\Listeners;

use App\Events\ChannelSubscribed;
use App\Notifications\NewSubscriberNotification;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;

class SendNewSubscriberNotification implements ShouldQueueAfterCommit
{
    /** @var string */
    public $queue = 'notifications';

    /** @var int */
    public $tries = 3;

    /**
     * Notify the channel owner when someone subscribes.
     */
    public function handle(ChannelSubscribed $event): void
    {
        $event->channel->notify(new NewSubscriberNotification($event->subscriber));
    }
}
