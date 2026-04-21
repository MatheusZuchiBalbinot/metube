<?php

use App\Enums\VideoStatus;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);


describe('ChannelController', function () {
    test('show returns channel profile', function () {
        $channel = User::factory()->create();
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson("/api/channels/{$channel->uuid}");

        $response->assertOk();
        $response->assertJsonPath('id', $channel->uuid);
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

        $response = $this->actingAs($subscriber)->postJson("/api/channels/{$channel->uuid}/subscribe");

        $response->assertNoContent();
        expect($subscriber->subscriptions()->where('channel_id', $channel->id)->exists())->toBeTrue();
    });

    test('toggle subscription unsubscribes if already subscribed', function () {
        $subscriber = User::factory()->create();
        $channel = User::factory()->create();
        $subscriber->subscriptions()->attach($channel->id);

        $response = $this->actingAs($subscriber)->postJson("/api/channels/{$channel->uuid}/subscribe");

        $response->assertNoContent();
        expect($subscriber->subscriptions()->where('channel_id', $channel->id)->exists())->toBeFalse();
    });
});
