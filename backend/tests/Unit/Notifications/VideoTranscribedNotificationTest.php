<?php

declare(strict_types=1);

use App\Enums\NotificationType;
use App\Models\User;
use App\Models\Video;
use App\Notifications\VideoTranscribedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('VideoTranscribedNotification', function () {
    test('payload includes correct type, vuid, and title', function () {
        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->published()->create(['title' => 'My Video']);

        $payload = (new VideoTranscribedNotification($video))->toArray(new stdClass());

        expect($payload['type'])->toBe(NotificationType::VIDEO_TRANSCRIBED->value)
            ->and($payload['vuid'])->toBe($video->vuid)
            ->and($payload['video_title'])->toBe('My Video');
    });

    test('sends via database and broadcast channels', function () {
        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->published()->create();

        $via = (new VideoTranscribedNotification($video))->via(new stdClass());

        expect($via)->toContain('database')->toContain('broadcast');
    });
});
