<?php

declare(strict_types=1);

use App\DTOs\CreatePlaylistDTO;
use App\DTOs\ReorderPlaylistVideosDTO;
use App\DTOs\UpdatePlaylistDTO;
use App\Models\Playlist;
use App\Models\User;
use App\Models\Video;
use App\Services\PlaylistService;
use Faker\Factory;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('PlaylistService', function () {
    $service = app(PlaylistService::class);

    beforeEach(function () use (&$service) {
        $service = app(PlaylistService::class);
    });

    test('create playlist for user', function () use (&$service) {
        $faker = Factory::create();
        $user = User::factory()->create();
        $playlistName = $faker->unique()->words(rand(1, 3), true);

        $playlist = $service->createPlaylist($user, new CreatePlaylistDTO($playlistName));

        expect($playlist->name)->toBe($playlistName);
        expect($playlist->user_id)->toBe($user->id);
        $this->assertDatabaseHas('playlists', ['name' => $playlistName]);
    });

    test('update playlist name', function () use (&$service) {
        $faker = Factory::create();
        $oldName = $faker->words(2, true);
        $newName = $faker->words(2, true);
        $playlist = Playlist::factory()->create(['name' => $oldName]);

        $updated = $service->updatePlaylist($playlist, new UpdatePlaylistDTO($newName));

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

    test('reorder videos updates positions when vuids match playlist exactly', function () use (&$service) {
        $playlist = Playlist::factory()->create();
        $videoA = Video::factory()->create();
        $videoB = Video::factory()->create();
        $playlist->videos()->attach([$videoA->id => ['position' => 0], $videoB->id => ['position' => 1]]);

        $service->reorderPlaylistVideos($playlist, new ReorderPlaylistVideosDTO([$videoB->vuid, $videoA->vuid]));

        $reordered = $playlist->videos()->orderByPivot('position')->get();
        expect($reordered->first()->id)->toBe($videoB->id)
            ->and($reordered->last()->id)->toBe($videoA->id);
    });

    test('reorder videos rejects a partial list missing playlist videos', function () use (&$service) {
        $playlist = Playlist::factory()->create();
        $videoA = Video::factory()->create();
        $videoB = Video::factory()->create();
        $playlist->videos()->attach([$videoA->id => ['position' => 0], $videoB->id => ['position' => 1]]);

        $reorder = fn () => $service->reorderPlaylistVideos($playlist, new ReorderPlaylistVideosDTO([$videoA->vuid]));

        expect($reorder)->toThrow(ModelNotFoundException::class);
    });

    test('reorder videos rejects extra vuids not in the playlist', function () use (&$service) {
        $playlist = Playlist::factory()->create();
        $videoA = Video::factory()->create();
        $extra = Video::factory()->create();
        $playlist->videos()->attach([$videoA->id => ['position' => 0]]);

        $reorder = fn () => $service->reorderPlaylistVideos(
            $playlist,
            new ReorderPlaylistVideosDTO([$videoA->vuid, $extra->vuid]),
        );

        expect($reorder)->toThrow(ModelNotFoundException::class);
    });

    test('reorder videos rejects duplicated vuids', function () use (&$service) {
        $playlist = Playlist::factory()->create();
        $videoA = Video::factory()->create();
        $videoB = Video::factory()->create();
        $playlist->videos()->attach([$videoA->id => ['position' => 0], $videoB->id => ['position' => 1]]);

        $reorder = fn () => $service->reorderPlaylistVideos(
            $playlist,
            new ReorderPlaylistVideosDTO([$videoA->vuid, $videoA->vuid]),
        );

        expect($reorder)->toThrow(ModelNotFoundException::class);
    });

    test('reorder videos rejects a non-existent vuid', function () use (&$service) {
        $playlist = Playlist::factory()->create();
        $videoA = Video::factory()->create();
        $playlist->videos()->attach([$videoA->id => ['position' => 0]]);

        $reorder = fn () => $service->reorderPlaylistVideos(
            $playlist,
            new ReorderPlaylistVideosDTO([$videoA->vuid, 'nonexistent']),
        );

        expect($reorder)->toThrow(ModelNotFoundException::class);
    });

    test('reorder videos rejects an empty list when the playlist has videos', function () use (&$service) {
        $playlist = Playlist::factory()->create();
        $videoA = Video::factory()->create();
        $playlist->videos()->attach([$videoA->id => ['position' => 0]]);

        $reorder = fn () => $service->reorderPlaylistVideos($playlist, new ReorderPlaylistVideosDTO([]));

        expect($reorder)->toThrow(ModelNotFoundException::class);
    });

    test('reorder videos is a no-op for an empty playlist with empty vuids', function () use (&$service) {
        $playlist = Playlist::factory()->create();

        $result = $service->reorderPlaylistVideos($playlist, new ReorderPlaylistVideosDTO([]));

        expect($result->videos)->toHaveCount(0);
    });
});
