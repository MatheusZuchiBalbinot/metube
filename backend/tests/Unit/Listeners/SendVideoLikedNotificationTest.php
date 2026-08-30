<?php

declare(strict_types=1);

use App\Events\VideoLiked;
use App\Listeners\SendVideoLikedNotification;
use App\Models\User;
use App\Models\Video;
use App\Notifications\VideoLikedNotification;
use Illuminate\Support\Facades\Notification;

describe('SendVideoLikedNotification', function () {
    test('notifies the video owner when a different user likes the video', function () {
        Notification::fake();

        $owner = User::factory()->create();
        $liker = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->published()->create();

        (new SendVideoLikedNotification())->handle(new VideoLiked($video, $liker, 1));

        Notification::assertSentTo($owner, VideoLikedNotification::class);
    });

    test('does not notify when the liker is the video owner', function () {
        Notification::fake();

        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->published()->create();

        (new SendVideoLikedNotification())->handle(new VideoLiked($video, $owner, 1));

        Notification::assertNothingSent();
    });

    test('listener is queued on the notifications queue', function () {
        $listener = new SendVideoLikedNotification();

        expect($listener->queue)->toBe('notifications')
            ->and($listener->tries)->toBe(3);
    });
});
