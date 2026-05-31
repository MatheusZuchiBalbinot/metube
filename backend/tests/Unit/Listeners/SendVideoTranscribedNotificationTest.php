<?php

declare(strict_types=1);

use App\Enums\TranscriptionStatus;
use App\Events\TranscriptionStatusUpdated;
use App\Events\VideoTranscriptionCompleted;
use App\Events\VideoTranscriptionStarted;
use App\Listeners\SendVideoTranscribedNotification;
use App\Listeners\SendVideoTranscriptionCompletedListener;
use App\Listeners\SendVideoTranscriptionStartedListener;
use App\Models\User;
use App\Models\Video;
use App\Notifications\VideoTranscribedNotification;
use App\Notifications\VideoTranscriptionStartedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

describe('SendVideoTranscribedNotification (deprecated)', function () {
    test('notifies the owner when transcription is completed via old event', function () {
        Notification::fake();

        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->published()->create();

        (new SendVideoTranscribedNotification)->handle(new TranscriptionStatusUpdated($video, TranscriptionStatus::COMPLETED));

        Notification::assertSentTo($owner, VideoTranscribedNotification::class);
    });

    test('notifies the owner when transcription starts via old event', function () {
        Notification::fake();

        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->published()->create();

        (new SendVideoTranscribedNotification)->handle(new TranscriptionStatusUpdated($video, TranscriptionStatus::PROCESSING));

        Notification::assertSentTo($owner, VideoTranscriptionStartedNotification::class);
    });

    test('does not notify for FAILED status', function () {
        Notification::fake();

        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->published()->create();

        (new SendVideoTranscribedNotification)->handle(new TranscriptionStatusUpdated($video, TranscriptionStatus::FAILED));

        Notification::assertNothingSent();
    });
});

describe('SendVideoTranscriptionStartedListener', function () {
    test('notifies the owner when transcription starts', function () {
        Notification::fake();

        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->published()->create();

        $event = new VideoTranscriptionStarted($video, Carbon::now(), 120.0);
        (new SendVideoTranscriptionStartedListener)->handle($event);

        Notification::assertSentTo($owner, VideoTranscriptionStartedNotification::class);
    });
});

describe('SendVideoTranscriptionCompletedListener', function () {
    test('notifies the owner when transcription completes', function () {
        Notification::fake();

        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->published()->create();

        $event = new VideoTranscriptionCompleted($video);
        (new SendVideoTranscriptionCompletedListener)->handle($event);

        Notification::assertSentTo($owner, VideoTranscribedNotification::class);
    });
});
