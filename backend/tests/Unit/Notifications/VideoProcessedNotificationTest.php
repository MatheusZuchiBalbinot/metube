<?php

declare(strict_types=1);

use App\Enums\NotificationType;
use App\Enums\VideoStatus;
use App\Models\User;
use App\Models\Video;
use App\Notifications\VideoProcessedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('VideoProcessedNotification', function () {
    test('payload includes correct type, vuid, title, and status', function () {
        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->published()->create(['title' => 'My Video']);

        $notification = new VideoProcessedNotification($video);
        $payload = $notification->toArray(new stdClass());

        expect($payload['type'])->toBe(NotificationType::VIDEO_PROCESSED->value)
            ->and($payload['vuid'])->toBe($video->vuid)
            ->and($payload['video_title'])->toBe('My Video')
            ->and($payload['failed'])->toBeFalse();
    });

    test('failed flag is true when video status is FAILED', function () {
        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->create(['status' => VideoStatus::FAILED]);

        $payload = (new VideoProcessedNotification($video))->toArray(new stdClass());

        expect($payload['failed'])->toBeTrue();
    });

    test('sends via database and broadcast channels', function () {
        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->published()->create();

        $via = (new VideoProcessedNotification($video))->via(new stdClass());

        expect($via)->toContain('database')->toContain('broadcast');
    });
});
