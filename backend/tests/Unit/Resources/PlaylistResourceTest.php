<?php

declare(strict_types=1);

use App\Http\Resources\PlaylistResource;
use App\Models\Playlist;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;

uses(RefreshDatabase::class);

describe('PlaylistResource', function () {
    test('toArray includes expected keys', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create(['name' => 'My List']);

        $array = (new PlaylistResource($playlist))->toArray(new Request);

        expect($array)->toHaveKeys(['puid', 'name', 'video_ids', 'created_at']);
    });

    test('name matches the playlist name', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();

        $array = (new PlaylistResource($playlist))->toArray(new Request);

        expect($array['name'])->toBe($playlist->name);
    });

    test('video_ids is empty array when videos relation not loaded', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();

        $array = (new PlaylistResource($playlist))->toArray(new Request);

        expect($array['video_ids'])->toBe([]);
    });

    test('video_ids contains vuids when videos relation is loaded', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $playlist->videos()->attach($video->id, ['position' => 0]);

        $playlist->load('videos');
        $array = (new PlaylistResource($playlist))->toArray(new Request);

        expect($array['video_ids'])->toContain($video->vuid);
    });

    test('created_at is ISO 8601 string', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();

        $array = (new PlaylistResource($playlist))->toArray(new Request);

        expect($array['created_at'])->toMatch('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/');
    });
});
