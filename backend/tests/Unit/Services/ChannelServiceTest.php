<?php

use App\Models\User;
use App\Services\ChannelService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('ChannelService', function () {
    $service = new ChannelService;

    beforeEach(function () use (&$service) {
        $service = new ChannelService;
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
});
