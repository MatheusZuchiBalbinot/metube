<?php

use App\Models\Playlist;
use App\Models\PlaylistVideo;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('PlaylistVideo Model', function () {
    test('playlist video entry belongs to a playlist', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();
        $video = Video::factory()->create();

        $playlist->videos()->attach($video->id, ['position' => 1]);

        $entry = PlaylistVideo::where('playlist_id', $playlist->id)
            ->where('video_id', $video->id)
            ->first();

        expect($entry)->not->toBeNull();
        expect($entry->playlist_id)->toBe($playlist->id);
    });

    test('playlist video entry belongs to a video', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();
        $video = Video::factory()->create();

        $playlist->videos()->attach($video->id, ['position' => 1]);

        $entry = PlaylistVideo::where('playlist_id', $playlist->id)
            ->where('video_id', $video->id)
            ->first();

        expect($entry)->not->toBeNull();
        expect($entry->video_id)->toBe($video->id);
    });

    test('playlist video has position field', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();
        $video = Video::factory()->create();

        $playlist->videos()->attach($video->id, ['position' => 7]);

        $entry = PlaylistVideo::where('playlist_id', $playlist->id)
            ->where('video_id', $video->id)
            ->first();

        expect($entry->position)->toBe(7);
    });

    test('playlist video uses correct table', function () {
        $entry = new PlaylistVideo;

        expect($entry->table)->toBe('playlist_video');
    });

    test('playlist video has no timestamps', function () {
        $entry = new PlaylistVideo;

        expect($entry->timestamps)->toBeFalse();
    });

    test('playlist video has expected fillable fields', function () {
        $entry = new PlaylistVideo;
        $fillable = $entry->getFillable();

        expect($fillable)->toContain('playlist_id');
        expect($fillable)->toContain('video_id');
        expect($fillable)->toContain('position');
    });
});
