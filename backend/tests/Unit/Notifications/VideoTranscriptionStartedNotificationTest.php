<?php

declare(strict_types=1);

use App\Enums\NotificationType;
use App\Models\User;
use App\Models\Video;
use App\Notifications\VideoTranscriptionStartedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Messages\BroadcastMessage;

uses(RefreshDatabase::class);

describe('VideoTranscriptionStartedNotification', function () {
    test('payload includes correct type, vuid, and video title', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['title' => 'My Transcription Video']);

        $payload = (new VideoTranscriptionStartedNotification($video))->toArray(new stdClass);

        expect($payload['type'])->toBe(NotificationType::VIDEO_TRANSCRIPTION_STARTED->value)
            ->and($payload['vuid'])->toBe($video->vuid)
            ->and($payload['video_title'])->toBe('My Transcription Video');
    });

    test('sends via database and broadcast channels', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $via = (new VideoTranscriptionStartedNotification($video))->via(new stdClass);

        expect($via)->toContain('database')->toContain('broadcast');
    });

    test('toBroadcast returns BroadcastMessage with correct payload', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $notification = new VideoTranscriptionStartedNotification($video);
        $broadcast = $notification->toBroadcast(new stdClass);

        expect($broadcast)->toBeInstanceOf(BroadcastMessage::class)
            ->and($broadcast->data['type'])->toBe(NotificationType::VIDEO_TRANSCRIPTION_STARTED->value)
            ->and($broadcast->data['vuid'])->toBe($video->vuid);
    });
});
