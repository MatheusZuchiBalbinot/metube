<?php

declare(strict_types=1);

use App\Models\Playlist;
use App\Models\User;
use App\Models\Video;

describe('Playlist Model', function () {
    test('playlist is created with auto-generated puid', function () {
        $playlist = Playlist::factory()->create();

        expect($playlist->puid)->not->toBeNull();
        expect(strlen($playlist->puid))->toBeGreaterThan(0);
    });

    test('playlist belongs to a user', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();

        expect($playlist->user_id)->toBe($user->id);
        expect($playlist->user->id)->toBe($user->id);
    });

    test('playlist can have videos via BelongsToMany', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();
        $video = Video::factory()->create();

        $playlist->videos()->attach($video->id, ['position' => 1]);

        expect($playlist->videos)->toHaveCount(1);
        expect($playlist->videos->first()->id)->toBe($video->id);
    });

    test('playlist videos are ordered by position', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();
        $video1 = Video::factory()->create();
        $video2 = Video::factory()->create();
        $video3 = Video::factory()->create();

        $playlist->videos()->attach($video3->id, ['position' => 3]);
        $playlist->videos()->attach($video1->id, ['position' => 1]);
        $playlist->videos()->attach($video2->id, ['position' => 2]);

        $orderedVideos = $playlist->videos()->get();

        expect($orderedVideos->first()->id)->toBe($video1->id);
        expect($orderedVideos->last()->id)->toBe($video3->id);
    });

    test('playlist has pivot with position field', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();
        $video = Video::factory()->create();

        $playlist->videos()->attach($video->id, ['position' => 5]);

        $pivotPosition = $playlist->videos()->first()->pivot->position;
        expect($pivotPosition)->toBe(5);
    });
});
