<?php

use App\Events\ChannelSubscribed;
use App\Events\ChannelUnsubscribed;
use App\Models\User;
use App\Services\ChannelService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

describe('ChannelService', function () {
    $service = app(ChannelService::class);

    beforeEach(function () use (&$service) {
        $service = app(ChannelService::class);
    });

    test('toggle subscription subscribes user to channel', function () use (&$service) {
        $subscriber = User::factory()->create();
        $channel = User::factory()->create();

        $service->toggleSubscription($subscriber, $channel->uuid);

        expect($subscriber->subscriptions()->where('channel_id', $channel->id)->exists())->toBeTrue();
    });

    test('toggle subscription unsubscribes if already subscribed', function () use (&$service) {
        $subscriber = User::factory()->create();
        $channel = User::factory()->create();
        $subscriber->subscriptions()->attach($channel->id);

        $service->toggleSubscription($subscriber, $channel->uuid);

        expect($subscriber->subscriptions()->where('channel_id', $channel->id)->exists())->toBeFalse();
    });

    test('toggle subscription dispatches ChannelSubscribed when subscribing', function () use (&$service) {
        Event::fake([ChannelSubscribed::class, ChannelUnsubscribed::class]);

        $subscriber = User::factory()->create();
        $channel = User::factory()->create();

        $service->toggleSubscription($subscriber, $channel->uuid);

        Event::assertDispatched(
            ChannelSubscribed::class,
            fn (ChannelSubscribed $event): bool => $event->subscriber->id === $subscriber->id
                && $event->channel->id === $channel->id,
        );
    });

    test('toggle subscription dispatches ChannelUnsubscribed when unsubscribing', function () use (&$service) {
        Event::fake([ChannelSubscribed::class, ChannelUnsubscribed::class]);

        $subscriber = User::factory()->create();
        $channel = User::factory()->create();
        $subscriber->subscriptions()->attach($channel->id);

        $service->toggleSubscription($subscriber, $channel->uuid);

        Event::assertDispatched(ChannelUnsubscribed::class);
    });
});
