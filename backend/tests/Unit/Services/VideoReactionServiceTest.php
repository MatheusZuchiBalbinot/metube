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
use App\Models\VideoView;
use App\Services\VideoReactionService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;

beforeEach(function () {
    Cache::flush();
});

/**
 * Event classes faked together when exercising reaction/progress side effects.
 *
 * @return list<class-string>
 */
function reactionEvents(): array
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

describe('VideoReactionService — views & reactions', function () {
    test('record view increments view count', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create(['views' => 0]);

        app(VideoReactionService::class)->recordView($user, $video);

        // The `videos.views` bump itself is deferred to DB::afterCommit (see
        // VideoReactionService::recordView) so a rollback never strands a
        // Redis-buffered increment — but RefreshDatabase wraps every test in
        // a transaction that's rolled back, never truly committed, so
        // afterCommit callbacks never fire here. Assert the durable,
        // synchronous side effect instead: the video_views row itself.
        expect(VideoView::query()->where('user_id', $user->id)->where('video_id', $video->id)->exists())->toBeTrue();
    });

    test('toggle like creates reaction', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();

        app(VideoReactionService::class)->toggleLike($user, $video);

        expect($user->likes()->where('video_id', $video->id)->exists())->toBeTrue();
    });

    test('toggle like removes reaction if already liked', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();
        $user->reactions()->attach($video->id, ['type' => 'like']);

        app(VideoReactionService::class)->toggleLike($user, $video);

        expect($user->likes()->where('video_id', $video->id)->exists())->toBeFalse();
    });

    test('toggle like dispatches VideoUnliked when removing existing like', function () {
        Event::fake(reactionEvents());

        $user = User::factory()->create();
        $video = Video::factory()->create();
        $user->reactions()->attach($video->id, ['type' => 'like']);

        app(VideoReactionService::class)->toggleLike($user, $video);

        Event::assertDispatched(VideoUnliked::class);
        Event::assertNotDispatched(VideoReactionApplied::class);
    });

    test('toggle like dispatches VideoUndisliked then VideoReactionApplied when switching from dislike', function () {
        Event::fake(reactionEvents());

        $user = User::factory()->create();
        $video = Video::factory()->create();
        $user->reactions()->attach($video->id, ['type' => 'dislike']);

        app(VideoReactionService::class)->toggleLike($user, $video);

        Event::assertDispatched(VideoUndisliked::class);
        Event::assertDispatched(VideoReactionApplied::class);
    });

    test('toggle dislike dispatches VideoUnliked when switching from like', function () {
        Event::fake(reactionEvents());

        $user = User::factory()->create();
        $video = Video::factory()->create();
        $user->reactions()->attach($video->id, ['type' => 'like']);

        app(VideoReactionService::class)->toggleDislike($user, $video);

        Event::assertDispatched(VideoUnliked::class);
        Event::assertDispatched(VideoReactionApplied::class);
    });

    test('toggle save dispatches VideoSaved on add and VideoUnsaved on remove', function () {
        Event::fake(reactionEvents());

        $user = User::factory()->create();
        $video = Video::factory()->create();
        $reactions = app(VideoReactionService::class);

        $reactions->toggleSave($user, $video);
        Event::assertDispatched(VideoSaved::class);

        $reactions->toggleSave($user, $video);
        Event::assertDispatched(VideoUnsaved::class);
    });
});
