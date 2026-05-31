<?php

declare(strict_types=1);

use App\Enums\NotificationType;
use App\Models\User;
use App\Models\Video;
use App\Notifications\VideoLikedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Messages\BroadcastMessage;

uses(RefreshDatabase::class);

describe('VideoLikedNotification', function () {
    test('payload includes correct type, liker name, vuid and video title', function () {
        $owner = User::factory()->create();
        $liker = User::factory()->create(['name' => 'Alice']);
        $video = Video::factory()->for($owner, 'channel')->published()->create(['title' => 'My Video']);

        $payload = (new VideoLikedNotification($video, $liker))->toArray(new stdClass);

        expect($payload['type'])->toBe(NotificationType::VIDEO_LIKED->value)
            ->and($payload['liker_name'])->toBe('Alice')
            ->and($payload['vuid'])->toBe($video->vuid)
            ->and($payload['video_title'])->toBe('My Video');
    });

    test('sends via database and broadcast channels', function () {
        $owner = User::factory()->create();
        $liker = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->published()->create();

        $via = (new VideoLikedNotification($video, $liker))->via(new stdClass);

        expect($via)->toContain('database')->toContain('broadcast');
    });

    test('toBroadcast returns BroadcastMessage with payload', function () {
        $owner = User::factory()->create();
        $liker = User::factory()->create(['name' => 'Alice']);
        $video = Video::factory()->for($owner, 'channel')->published()->create(['title' => 'My Video']);

        $notification = new VideoLikedNotification($video, $liker);
        $broadcast = $notification->toBroadcast(new stdClass);

        expect($broadcast)->toBeInstanceOf(BroadcastMessage::class)
            ->and($broadcast->data['type'])->toBe(NotificationType::VIDEO_LIKED->value)
            ->and($broadcast->data['liker_name'])->toBe('Alice');
    });
});
