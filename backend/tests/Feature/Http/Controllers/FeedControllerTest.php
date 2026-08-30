<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Video;

describe('FeedController', function () {
    test('guest receives generic feed sections', function () {
        $creator = User::factory()->create();
        Video::factory()->count(3)->for($creator, 'channel')->published()->create();

        $response = $this->getJson('/api/feed');

        $response->assertOk()
            ->assertJsonStructure(['data' => [['key', 'label', 'videos']]]);

        $keys = collect($response->json('data'))->pluck('key');

        expect($keys)->toContain('trending')
            ->and($keys)->not->toContain('subscriptions');
    });

    test('subscribed user receives the subscriptions section', function () {
        $creator = User::factory()->create();
        Video::factory()->count(2)->for($creator, 'channel')->published()->create();

        $user = User::factory()->create();
        $user->subscriptions()->attach($creator->id);

        $response = $this->actingAs($user)->getJson('/api/feed');

        $response->assertOk();
        $keys = collect($response->json('data'))->pluck('key');

        expect($keys)->toContain('subscriptions');
    });
});
