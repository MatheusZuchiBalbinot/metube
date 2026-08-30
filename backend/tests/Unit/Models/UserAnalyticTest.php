<?php

declare(strict_types=1);

use App\Enums\VideoEventType;
use App\Models\User;
use App\Models\UserAnalytic;
use App\Models\Video;

describe('UserAnalytic Model', function () {
    test('user analytic belongs to a user', function () {
        $user = User::factory()->create();
        $analytic = UserAnalytic::create([
            'user_id' => $user->id,
            'event_type' => VideoEventType::VIEW,
            'occurred_at' => now(),
        ]);

        expect($analytic->user_id)->toBe($user->id);
        expect($analytic->user->id)->toBe($user->id);
    });

    test('user analytic belongs to a video when video_id is set', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();
        $analytic = UserAnalytic::create([
            'user_id' => $user->id,
            'video_id' => $video->id,
            'event_type' => VideoEventType::VIEW,
            'occurred_at' => now(),
        ]);

        expect($analytic->video_id)->toBe($video->id);
        expect($analytic->video->id)->toBe($video->id);
    });

    test('user analytic belongs to a channel when channel_id is set', function () {
        $user = User::factory()->create();
        $channel = User::factory()->create();
        $analytic = UserAnalytic::create([
            'user_id' => $user->id,
            'channel_id' => $channel->id,
            'event_type' => VideoEventType::SUBSCRIBE,
            'occurred_at' => now(),
        ]);

        expect($analytic->channel_id)->toBe($channel->id);
        expect($analytic->channel->id)->toBe($channel->id);
    });

    test('event_type is cast to VideoEventType enum', function () {
        $user = User::factory()->create();
        $analytic = UserAnalytic::create([
            'user_id' => $user->id,
            'event_type' => VideoEventType::LIKE,
            'occurred_at' => now(),
        ]);

        expect($analytic->event_type)->toBe(VideoEventType::LIKE);
    });

    test('payload is cast to array', function () {
        $user = User::factory()->create();
        $payload = ['source' => 'feed', 'position' => 3];
        $analytic = UserAnalytic::create([
            'user_id' => $user->id,
            'event_type' => VideoEventType::CLICK,
            'payload' => $payload,
            'occurred_at' => now(),
        ]);

        expect($analytic->payload)->toBeArray();
        expect($analytic->payload)->toEqual($payload);
    });

    test('occurred_at is cast to datetime', function () {
        $user = User::factory()->create();
        $now = now();
        $analytic = UserAnalytic::create([
            'user_id' => $user->id,
            'event_type' => VideoEventType::VIEW,
            'occurred_at' => $now,
        ]);

        expect($analytic->occurred_at)->not->toBeNull();
        expect($analytic->occurred_at->toDateString())->toBe($now->toDateString());
    });

    test('user analytic uses correct table', function () {
        $analytic = new UserAnalytic();

        expect($analytic->getTable())->toBe('user_analytics');
    });

    test('user analytic has no timestamps', function () {
        $analytic = new UserAnalytic();

        expect($analytic->timestamps)->toBeFalse();
    });
});
