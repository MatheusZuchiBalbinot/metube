<?php

use App\Events\VideoPublished;
use App\Jobs\NotifySubscribersChunk;
use App\Listeners\SendVideoPublishedNotifications;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

describe('SendVideoPublishedNotifications', function () {
    test('dispatches NotifySubscribersChunk job for subscribers', function () {
        Queue::fake();

        $channel = User::factory()->create();
        $video = Video::factory()->for($channel, 'channel')->published()->create();

        $subscriber1 = User::factory()->create();
        $subscriber2 = User::factory()->create();
        $channel->subscribers()->attach([$subscriber1->id, $subscriber2->id]);

        (new SendVideoPublishedNotifications)->handle(new VideoPublished($video));

        Queue::assertPushed(NotifySubscribersChunk::class);
    });

    test('does not dispatch jobs when video has no subscribers', function () {
        Queue::fake();

        $channel = User::factory()->create();
        $video = Video::factory()->for($channel, 'channel')->published()->create();

        (new SendVideoPublishedNotifications)->handle(new VideoPublished($video));

        Queue::assertNothingPushed();
    });

    test('does not dispatch jobs when video was deleted before handling', function () {
        Queue::fake();

        $channel = User::factory()->create();
        $subscriber = User::factory()->create();
        $channel->subscribers()->attach($subscriber->id);
        $video = Video::factory()->for($channel, 'channel')->published()->create();
        $videoPublished = new VideoPublished($video);
        $video->delete();

        (new SendVideoPublishedNotifications)->handle($videoPublished);

        Queue::assertNothingPushed();
    });

    test('listener is queued on the notifications queue', function () {
        $listener = new SendVideoPublishedNotifications;

        expect($listener->queue)->toBe('notifications')
            ->and($listener->tries)->toBe(3);
    });
});
