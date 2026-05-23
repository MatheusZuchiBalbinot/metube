<?php

use App\Models\User;
use App\Models\Video;
use App\Models\WatchHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('WatchHistory Model', function () {
    test('watch history belongs to a user', function () {
        $user = User::factory()->create();
        $history = WatchHistory::factory()->for($user)->create();

        expect($history->user_id)->toBe($user->id);
        expect($history->user->id)->toBe($user->id);
    });

    test('watch history belongs to a video', function () {
        $video = Video::factory()->create();
        $history = WatchHistory::factory()->for($video)->create();

        expect($history->video_id)->toBe($video->id);
        expect($history->video->id)->toBe($video->id);
    });

    test('watched_at is cast to datetime', function () {
        $now = now();
        $history = WatchHistory::factory()->create(['watched_at' => $now]);

        expect($history->watched_at)->not->toBeNull();
        expect($history->watched_at->toDateString())->toBe($now->toDateString());
    });

    test('watch history uses correct table', function () {
        $history = new WatchHistory;

        expect($history->getTable())->toBe('watch_histories');
    });

    test('watch history has no timestamps', function () {
        $history = new WatchHistory;

        expect($history->timestamps)->toBeFalse();
    });
});
