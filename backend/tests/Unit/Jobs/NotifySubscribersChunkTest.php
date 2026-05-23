<?php

use App\Jobs\NotifySubscribersChunk;
use App\Models\User;
use App\Models\Video;
use App\Notifications\VideoFromSubscriptionNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

describe('NotifySubscribersChunk', function () {
    test('handle sends notification to each user in the chunk', function () {
        Notification::fake();

        $channel = User::factory()->create();
        $video = Video::factory()->for($channel, 'channel')->create();
        $subscriber1 = User::factory()->create();
        $subscriber2 = User::factory()->create();

        $job = new NotifySubscribersChunk($video, [$subscriber1->id, $subscriber2->id]);
        $job->handle();

        Notification::assertSentTo($subscriber1, VideoFromSubscriptionNotification::class);
        Notification::assertSentTo($subscriber2, VideoFromSubscriptionNotification::class);
    });

    test('handle does nothing when userIds list is empty', function () {
        Notification::fake();

        $channel = User::factory()->create();
        $video = Video::factory()->for($channel, 'channel')->create();

        $job = new NotifySubscribersChunk($video, []);
        $job->handle();

        Notification::assertNothingSent();
    });

    test('handle does nothing when no users match the given ids', function () {
        Notification::fake();

        $channel = User::factory()->create();
        $video = Video::factory()->for($channel, 'channel')->create();

        $job = new NotifySubscribersChunk($video, [999999]);
        $job->handle();

        Notification::assertNothingSent();
    });

    test('handle sends notification with the correct video', function () {
        Notification::fake();

        $channel = User::factory()->create();
        $video = Video::factory()->for($channel, 'channel')->create();
        $subscriber = User::factory()->create();

        $job = new NotifySubscribersChunk($video, [$subscriber->id]);
        $job->handle();

        Notification::assertSentTo(
            $subscriber,
            VideoFromSubscriptionNotification::class,
            fn (VideoFromSubscriptionNotification $notif): bool => $notif->video->id === $video->id,
        );
    });

    test('job is queued on the notifications queue', function () {
        $channel = User::factory()->create();
        $video = Video::factory()->for($channel, 'channel')->create();

        $job = new NotifySubscribersChunk($video, []);

        expect($job->queue)->toBe('notifications');
    });

    test('job has 3 tries configured', function () {
        $channel = User::factory()->create();
        $video = Video::factory()->for($channel, 'channel')->create();

        $job = new NotifySubscribersChunk($video, []);

        expect($job->tries)->toBe(3);
    });
});
