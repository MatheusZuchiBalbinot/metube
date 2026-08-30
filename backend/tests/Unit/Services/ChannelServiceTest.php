<?php

declare(strict_types=1);

use App\Enums\VideoStatus;
use App\Events\ChannelSubscribed;
use App\Events\ChannelUnsubscribed;
use App\Models\User;
use App\Models\Video;
use App\Services\ChannelService;
use Illuminate\Support\Facades\Event;

describe('ChannelService', function () {
    $service = app(ChannelService::class);

    beforeEach(function () use (&$service) {
        config(['cache.metube.channel.videos.active' => false]);
        $service = app(ChannelService::class);
    });

    test('listVideos returns only published videos using the given page', function () use (&$service) {
        $channel = User::factory()->create();
        Video::factory(2)->for($channel, 'channel')->create(['status' => VideoStatus::PUBLISHED]);
        Video::factory(3)->for($channel, 'channel')->create(['status' => VideoStatus::DRAFT]);

        $result = $service->listVideos($channel, false, 1);

        expect($result->total())->toBe(2);
    });

    test('listVideos includes all statuses when includeAllStatuses is true', function () use (&$service) {
        $channel = User::factory()->create();
        Video::factory(2)->for($channel, 'channel')->create(['status' => VideoStatus::PUBLISHED]);
        Video::factory(3)->for($channel, 'channel')->create(['status' => VideoStatus::DRAFT]);

        $result = $service->listVideos($channel, true, 1);

        expect($result->total())->toBe(5);
    });

    test('listVideos does not read the request and honours the page argument', function () use (&$service) {
        $channel = User::factory()->create();
        Video::factory(1)->for($channel, 'channel')->create(['status' => VideoStatus::PUBLISHED]);

        $result = $service->listVideos($channel, false, 99);

        expect($result->currentPage())->toBe(99)
            ->and($result->items())->toBeEmpty();
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
