<?php

use App\Models\Playlist;
use App\Models\User;
use App\Models\Video;
use App\Services\PlaylistService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('PlaylistService', function () {
    $service = app(PlaylistService::class);

    beforeEach(function () use (&$service) {
        $service = app(PlaylistService::class);
    });

    test('create playlist for user', function () use (&$service) {
        $faker = \Faker\Factory::create();
        $user = User::factory()->create();
        $playlistName = $faker->unique()->words(rand(1, 3), true);

        $playlist = $service->createPlaylist($user, $playlistName);

        expect($playlist->name)->toBe($playlistName);
        expect($playlist->user_id)->toBe($user->id);
        $this->assertDatabaseHas('playlists', ['name' => $playlistName]);
    });

    test('get playlist by puid', function () use (&$service) {
        $playlist = Playlist::factory()->create();

        $found = $service->getPlaylistByPuid($playlist->puid);

        expect($found->id)->toBe($playlist->id);
    });

    test('update playlist name', function () use (&$service) {
        $faker = \Faker\Factory::create();
        $oldName = $faker->words(2, true);
        $newName = $faker->words(2, true);
        $playlist = Playlist::factory()->create(['name' => $oldName]);

        $updated = $service->updatePlaylist($playlist, $newName);

        expect($updated->name)->toBe($newName);
        expect($updated->name)->not->toBe($oldName);
    });

    test('delete playlist', function () use (&$service) {
        $playlist = Playlist::factory()->create();
        $playlistId = $playlist->id;

        $service->deletePlaylist($playlist);

        $this->assertDatabaseMissing('playlists', ['id' => $playlistId]);
    });

    test('add video to playlist', function () use (&$service) {
        $playlist = Playlist::factory()->create();
        $videoCount = rand(1, 5);
        $videos = Video::factory($videoCount)->create();

        $videos->each(fn ($video) => $service->addVideoToPlaylist($playlist, $video->vuid));

        expect($playlist->videos)->toHaveCount($videoCount);
        $videos->each(fn ($video) => expect($playlist->videos()->where('video_id', $video->id)->exists())->toBeTrue());
    });

    test('remove video from playlist', function () use (&$service) {
        $playlist = Playlist::factory()->create();
        $videoCount = rand(2, 8);
        $videos = Video::factory($videoCount)->create();
        $videos->each(fn ($video) => $playlist->videos()->attach($video->id));

        $videoToRemove = $videos->random();
        $service->removeVideoFromPlaylist($playlist, $videoToRemove->vuid);

        expect($playlist->videos()->where('video_id', $videoToRemove->id)->exists())->toBeFalse();
        expect($playlist->videos)->toHaveCount($videoCount - 1);
    });
});
