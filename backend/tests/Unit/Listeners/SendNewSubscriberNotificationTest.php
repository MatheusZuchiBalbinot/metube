<?php

declare(strict_types=1);

use App\Events\ChannelSubscribed;
use App\Listeners\SendNewSubscriberNotification;
use App\Models\User;
use App\Notifications\NewSubscriberNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

describe('SendNewSubscriberNotification', function () {
    test('notifies the channel owner when someone subscribes', function () {
        Notification::fake();

        $channel = User::factory()->create();
        $subscriber = User::factory()->create();

        (new SendNewSubscriberNotification)->handle(new ChannelSubscribed($subscriber, $channel));

        Notification::assertSentTo($channel, NewSubscriberNotification::class);
    });

    test('listener is queued on the notifications queue', function () {
        $listener = new SendNewSubscriberNotification;

        expect($listener->queue)->toBe('notifications')
            ->and($listener->tries)->toBe(3);
    });
});
