<?php

declare(strict_types=1);

use App\Enums\VideoStatus;
use App\Models\User;
use App\Models\Video;

describe('ChannelController', function () {
    test('show returns channel profile', function () {
        $channel = User::factory()->create();
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson("/api/channels/{$channel->uuid}");

        $response->assertOk();
        $response->assertJsonPath('uuid', $channel->uuid);
    });

    test('videos returns published videos from channel', function () {
        $channel = User::factory()->create();
        $user = User::factory()->create();
        Video::factory(3)->for($channel, 'channel')->create(['status' => VideoStatus::PUBLISHED]);
        Video::factory(2)->for($channel, 'channel')->create(['status' => VideoStatus::DRAFT]);

        $response = $this->actingAs($user)->getJson("/api/channels/{$channel->uuid}/videos");

        $response->assertOk();
        $response->assertJsonCount(3, 'data');
    });

    test('toggle subscription subscribes user', function () {
        $subscriber = User::factory()->create();
        $channel = User::factory()->create();

        $response = $this->actingAs($subscriber)->postJson("/api/channels/{$channel->uuid}/subscription");

        $response->assertNoContent();
        expect($subscriber->subscriptions()->where('channel_id', $channel->id)->exists())->toBeTrue();
    });

    test('toggle subscription unsubscribes if already subscribed', function () {
        $subscriber = User::factory()->create();
        $channel = User::factory()->create();
        $subscriber->subscriptions()->attach($channel->id);

        $response = $this->actingAs($subscriber)->postJson("/api/channels/{$channel->uuid}/subscription");

        $response->assertNoContent();
        expect($subscriber->subscriptions()->where('channel_id', $channel->id)->exists())->toBeFalse();
    });

    test('show is accessible to guests', function () {
        $channel = User::factory()->create();
        $response = $this->getJson("/api/channels/{$channel->uuid}");
        $response->assertOk();
    });

    test('videos is accessible to guests', function () {
        $channel = User::factory()->create();
        $response = $this->getJson("/api/channels/{$channel->uuid}/videos");
        $response->assertOk();
    });

    test('videos honours the page query parameter', function () {
        config(['cache.metube.channel.videos.active' => false]);

        $channel = User::factory()->create();
        $user = User::factory()->create();
        Video::factory(3)->for($channel, 'channel')->create(['status' => VideoStatus::PUBLISHED]);

        $response = $this->actingAs($user)->getJson("/api/channels/{$channel->uuid}/videos?page=2");

        $response->assertOk();
        $response->assertJsonPath('meta.current_page', 2);
        $response->assertJsonCount(0, 'data');
    });

    test('show returns 404 for non-existent channel', function () {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->getJson('/api/channels/00000000-0000-0000-0000-000000000000');
        $response->assertNotFound();
    });

    test('toggle subscription returns 401 for unauthenticated request', function () {
        $channel = User::factory()->create();
        $response = $this->postJson("/api/channels/{$channel->uuid}/subscription");
        $response->assertUnauthorized();
    });
});
