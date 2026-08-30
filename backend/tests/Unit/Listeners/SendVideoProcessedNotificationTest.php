<?php

declare(strict_types=1);

use App\Enums\VideoStatus;
use App\Events\VideoStatusUpdated;
use App\Listeners\SendVideoProcessedNotification;
use App\Models\User;
use App\Models\Video;
use App\Notifications\VideoProcessedNotification;
use Illuminate\Support\Facades\Notification;

describe('SendVideoProcessedNotification', function () {
    test('notifies the owner when video status becomes published', function () {
        Notification::fake();

        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->published()->create();

        (new SendVideoProcessedNotification())->handle(new VideoStatusUpdated($video, VideoStatus::PUBLISHED));

        Notification::assertSentTo($owner, VideoProcessedNotification::class);
    });

    test('notifies the owner when video status becomes failed', function () {
        Notification::fake();

        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->create(['status' => VideoStatus::FAILED]);

        (new SendVideoProcessedNotification())->handle(new VideoStatusUpdated($video, VideoStatus::FAILED));

        Notification::assertSentTo($owner, VideoProcessedNotification::class);
    });

    test('does not notify for intermediate statuses', function () {
        Notification::fake();

        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->processing()->create();

        (new SendVideoProcessedNotification())->handle(new VideoStatusUpdated($video, VideoStatus::PROCESSING));

        Notification::assertNothingSent();
    });
});
