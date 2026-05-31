<?php

declare(strict_types=1);

use App\Enums\VideoSource;
use App\Events\VideoImpressionsBatch;
use App\Listeners\LogImpressionsBatch;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

describe('LogImpressionsBatch', function () {
    test('bulk-inserts impression rows for each item in the batch', function () {
        $user = User::factory()->create();
        $videoA = Video::factory()->for($user, 'channel')->create();
        $videoB = Video::factory()->for($user, 'channel')->create();

        $event = new VideoImpressionsBatch(
            user: $user,
            items: [
                ['video_id' => $videoA->id, 'position' => 0],
                ['video_id' => $videoB->id, 'position' => 1],
            ],
            source: VideoSource::FEED,
            sessionId: 'sess-abc',
        );

        (new LogImpressionsBatch)->handle($event);

        expect(DB::table('user_analytics')->count())->toBe(2);
    });

    test('does not insert when items list is empty', function () {
        $user = User::factory()->create();

        $event = new VideoImpressionsBatch(
            user: $user,
            items: [],
            source: VideoSource::FEED,
            sessionId: null,
        );

        (new LogImpressionsBatch)->handle($event);

        expect(DB::table('user_analytics')->count())->toBe(0);
    });

    test('listener is queued on the analytics queue', function () {
        $listener = new LogImpressionsBatch;

        expect($listener->queue)->toBe('analytics')
            ->and($listener->tries)->toBe(3);
    });
});
