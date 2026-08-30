<?php

declare(strict_types=1);

use App\Http\Resources\WatchHistoryResource;
use App\Models\User;
use App\Models\Video;
use App\Models\WatchHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

describe('WatchHistoryResource', function () {
    test('toArray includes vuid and watched_at', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $watchedAt = Carbon::parse('2025-01-15 10:00:00');

        $history = WatchHistory::create([
            'user_id' => $user->id,
            'video_id' => $video->id,
            'watched_at' => $watchedAt,
            'watched_hour' => $watchedAt->format('Y-m-d H:00:00'),
        ]);

        $history->load('video');
        $resource = new WatchHistoryResource($history);
        $array = $resource->toArray(new Request());

        expect($array)->toHaveKey('vuid')
            ->and($array)->toHaveKey('watched_at')
            ->and($array['vuid'])->toBe($video->vuid);
    });

    test('watched_at is formatted as ISO 8601', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $watchedAt = Carbon::parse('2025-06-10 14:30:00');

        $history = WatchHistory::create([
            'user_id' => $user->id,
            'video_id' => $video->id,
            'watched_at' => $watchedAt,
            'watched_hour' => $watchedAt->format('Y-m-d H:00:00'),
        ]);

        $history->load('video');
        $resource = new WatchHistoryResource($history);
        $array = $resource->toArray(new Request());

        expect($array['watched_at'])->toMatch('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/');
    });

    test('collection wraps multiple history entries', function () {
        $user = User::factory()->create();
        $videoA = Video::factory()->for($user, 'channel')->create();
        $videoB = Video::factory()->for($user, 'channel')->create();

        $now = Carbon::now();
        WatchHistory::create([
            'user_id' => $user->id,
            'video_id' => $videoA->id,
            'watched_at' => $now,
            'watched_hour' => $now->format('Y-m-d H:00:00'),
        ]);
        WatchHistory::create([
            'user_id' => $user->id,
            'video_id' => $videoB->id,
            'watched_at' => $now,
            'watched_hour' => $now->format('Y-m-d H:00:00'),
        ]);

        $histories = WatchHistory::with('video')->get();
        $collection = WatchHistoryResource::collection($histories);

        expect($collection)->toHaveCount(2);
    });
});
