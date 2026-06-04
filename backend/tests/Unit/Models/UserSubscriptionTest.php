<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\UserSubscription;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('UserSubscription Model', function () {
    test('subscription subscriber belongs to a user', function () {
        $subscriber = User::factory()->create();
        $channel = User::factory()->create();

        $subscription = UserSubscription::create([
            'user_id' => $subscriber->id,
            'channel_id' => $channel->id,
        ]);

        expect($subscription->subscriber->id)->toBe($subscriber->id);
    });

    test('subscription channel belongs to a user', function () {
        $subscriber = User::factory()->create();
        $channel = User::factory()->create();

        $subscription = UserSubscription::create([
            'user_id' => $subscriber->id,
            'channel_id' => $channel->id,
        ]);

        expect($subscription->channel->id)->toBe($channel->id);
    });

    test('subscription uses correct table', function () {
        $subscription = new UserSubscription();

        expect($subscription->table)->toBe('user_subscriptions');
    });

    test('subscription has no timestamps', function () {
        $subscription = new UserSubscription();

        expect($subscription->timestamps)->toBeFalse();
    });

    test('subscription has expected fillable fields', function () {
        $subscription = new UserSubscription();
        $fillable = $subscription->getFillable();

        expect($fillable)->toContain('user_id');
        expect($fillable)->toContain('channel_id');
    });
});
