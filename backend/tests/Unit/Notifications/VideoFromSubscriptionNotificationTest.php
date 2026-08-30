<?php

declare(strict_types=1);

use App\Enums\NotificationType;
use App\Models\User;
use App\Models\Video;
use App\Notifications\VideoFromSubscriptionNotification;
use Illuminate\Notifications\Messages\BroadcastMessage;

describe('VideoFromSubscriptionNotification', function () {
    test('payload includes correct type, channel name, vuid and video title', function () {
        $channel = User::factory()->create(['name' => 'Tech Channel']);
        $video = Video::factory()->for($channel, 'channel')->published()->create(['title' => 'New Episode']);

        $payload = (new VideoFromSubscriptionNotification($video->load('channel')))->toArray(new stdClass());

        expect($payload['type'])->toBe(NotificationType::VIDEO_FROM_SUBSCRIPTION->value)
            ->and($payload['channel_name'])->toBe('Tech Channel')
            ->and($payload['vuid'])->toBe($video->vuid)
            ->and($payload['video_title'])->toBe('New Episode');
    });

    test('sends via database and broadcast channels', function () {
        $channel = User::factory()->create();
        $video = Video::factory()->for($channel, 'channel')->published()->create();

        $via = (new VideoFromSubscriptionNotification($video->load('channel')))->via(new stdClass());

        expect($via)->toContain('database')->toContain('broadcast');
    });

    test('toBroadcast returns BroadcastMessage with payload', function () {
        $channel = User::factory()->create(['name' => 'Tech Channel']);
        $video = Video::factory()->for($channel, 'channel')->published()->create(['title' => 'Episode 1']);

        $notification = new VideoFromSubscriptionNotification($video->load('channel'));
        $broadcast = $notification->toBroadcast(new stdClass());

        expect($broadcast)->toBeInstanceOf(BroadcastMessage::class)
            ->and($broadcast->data['type'])->toBe(NotificationType::VIDEO_FROM_SUBSCRIPTION->value)
            ->and($broadcast->data['channel_name'])->toBe('Tech Channel');
    });
});
