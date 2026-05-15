<?php

use App\Events\SearchPerformed;
use App\Events\VideoClickedFromFeed;
use App\Events\VideoImpressionsBatch;
use App\Events\VideoSkipped;
use App\Models\User;
use App\Models\Video;
use App\Services\AnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

describe('AnalyticsService', function () {
    test('recordImpressions dispatches one batch event with all known vuids in order', function () {
        Event::fake([
            VideoImpressionsBatch::class,
            VideoClickedFromFeed::class,
            SearchPerformed::class,
            VideoSkipped::class,
        ]);

        $user = User::factory()->create();
        $videos = Video::factory(3)->create();
        $vuids = $videos->pluck('vuid')->all();

        (new AnalyticsService)->recordImpressions($user, $vuids, 'feed', 'sess-1');

        Event::assertDispatchedTimes(VideoImpressionsBatch::class, 1);

        Event::assertDispatched(
            VideoImpressionsBatch::class,
            function (VideoImpressionsBatch $event) use ($videos, $vuids): bool {
                if ($event->source !== 'feed' || $event->sessionId !== 'sess-1') {
                    return false;
                }

                foreach ($vuids as $position => $vuid) {
                    $video = $videos->firstWhere('vuid', $vuid);
                    $item = $event->items[$position] ?? null;

                    if ($item === null || $item['video_id'] !== $video->id || $item['position'] !== $position) {
                        return false;
                    }
                }

                return true;
            },
        );
    });

    test('recordImpressions silently ignores unknown vuids', function () {
        Event::fake([
            VideoImpressionsBatch::class,
            VideoClickedFromFeed::class,
            SearchPerformed::class,
            VideoSkipped::class,
        ]);

        $user = User::factory()->create();
        $video = Video::factory()->create();

        (new AnalyticsService)->recordImpressions($user, [$video->vuid, 'unknownvuid'], 'home');

        Event::assertDispatched(
            VideoImpressionsBatch::class,
            fn (VideoImpressionsBatch $event): bool => count($event->items) === 1,
        );
    });

    test('recordImpressions dispatches nothing when all vuids are unknown', function () {
        Event::fake([VideoImpressionsBatch::class]);

        $user = User::factory()->create();

        (new AnalyticsService)->recordImpressions($user, ['notexist1', 'notexist2'], 'feed');

        Event::assertNotDispatched(VideoImpressionsBatch::class);
    });

    test('recordClick dispatches VideoClickedFromFeed', function () {
        Event::fake([
            VideoImpressionsBatch::class,
            VideoClickedFromFeed::class,
            SearchPerformed::class,
            VideoSkipped::class,
        ]);

        $user = User::factory()->create();
        $video = Video::factory()->create();

        (new AnalyticsService)->recordClick($user, $video, 'recommended', 2, 'sess-9');

        Event::assertDispatched(
            VideoClickedFromFeed::class,
            fn (VideoClickedFromFeed $event): bool => $event->video->id === $video->id
                && $event->source === 'recommended'
                && $event->position === 2
                && $event->sessionId === 'sess-9',
        );
    });

    test('recordSearch dispatches SearchPerformed', function () {
        Event::fake([
            VideoImpressionsBatch::class,
            VideoClickedFromFeed::class,
            SearchPerformed::class,
            VideoSkipped::class,
        ]);

        $user = User::factory()->create();

        (new AnalyticsService)->recordSearch($user, 'laravel queues', 7);

        Event::assertDispatched(
            SearchPerformed::class,
            fn (SearchPerformed $event): bool => $event->query === 'laravel queues'
                && $event->resultCount === 7,
        );
    });

    test('recordSkip dispatches VideoSkipped with percent', function () {
        Event::fake([
            VideoImpressionsBatch::class,
            VideoClickedFromFeed::class,
            SearchPerformed::class,
            VideoSkipped::class,
        ]);

        $user = User::factory()->create();
        $video = Video::factory()->create();

        (new AnalyticsService)->recordSkip($user, $video, 8);

        Event::assertDispatched(
            VideoSkipped::class,
            fn (VideoSkipped $event): bool => $event->video->id === $video->id && $event->percent === 8,
        );
    });
});
