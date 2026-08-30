<?php

declare(strict_types=1);

use App\Events\VideoFinished;
use App\Events\VideoReactionApplied;
use App\Events\VideoSaved;
use App\Events\VideoUndisliked;
use App\Events\VideoUnliked;
use App\Events\VideoUnsaved;
use App\Models\User;
use App\Models\Video;
use App\Services\VideoProgressService;
use Illuminate\Support\Facades\Event;

/**
 * Event classes faked together when exercising progress side effects.
 *
 * @return list<class-string>
 */
function progressEvents(): array
{
    return [
        VideoUnliked::class,
        VideoUndisliked::class,
        VideoUnsaved::class,
        VideoSaved::class,
        VideoFinished::class,
        VideoReactionApplied::class,
    ];
}

describe('VideoProgressService — progress', function () {
    test('updateProgress dispatches VideoFinished only on first crossing of 95 percent', function () {
        Event::fake(progressEvents());

        $user = User::factory()->create();
        $video = Video::factory()->create();
        $progress = app(VideoProgressService::class);

        $progress->updateProgress($user, $video, 50);
        Event::assertNotDispatched(VideoFinished::class);

        $progress->updateProgress($user, $video, 96);
        Event::assertDispatchedTimes(VideoFinished::class, 1);

        $progress->updateProgress($user, $video, 99);
        Event::assertDispatchedTimes(VideoFinished::class, 1);
    });
});
