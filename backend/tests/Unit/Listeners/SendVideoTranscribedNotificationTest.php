<?php

use App\Enums\TranscriptionStatus;
use App\Events\TranscriptionStatusUpdated;
use App\Listeners\SendVideoTranscribedNotification;
use App\Models\User;
use App\Models\Video;
use App\Notifications\VideoTranscribedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

describe('SendVideoTranscribedNotification', function () {
    test('notifies the owner when transcription is completed', function () {
        Notification::fake();

        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->published()->create();

        (new SendVideoTranscribedNotification)->handle(new TranscriptionStatusUpdated($video, TranscriptionStatus::COMPLETED));

        Notification::assertSentTo($owner, VideoTranscribedNotification::class);
    });

    test('does not notify for PROCESSING status', function () {
        Notification::fake();

        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->published()->create();

        (new SendVideoTranscribedNotification)->handle(new TranscriptionStatusUpdated($video, TranscriptionStatus::PROCESSING));

        Notification::assertNothingSent();
    });

    test('does not notify for FAILED status', function () {
        Notification::fake();

        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->published()->create();

        (new SendVideoTranscribedNotification)->handle(new TranscriptionStatusUpdated($video, TranscriptionStatus::FAILED));

        Notification::assertNothingSent();
    });
});
