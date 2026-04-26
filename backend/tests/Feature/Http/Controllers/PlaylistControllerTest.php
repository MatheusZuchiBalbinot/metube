<?php

use App\Models\Playlist;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
uses(RefreshDatabase::class);
use Tests\TestCase;


describe('PlaylistController', function () {
    test('index returns user playlists', function () {
        $user = User::factory()->create();
        Playlist::factory(3)->for($user)->create();

        $response = $this->actingAs($user)->getJson('/api/playlists');

        $response->assertOk();
        $response->assertJsonCount(4, 'data');
    });

    test('store creates new playlist', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/playlists', [
            'name' => 'My Playlist',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('playlists', ['name' => 'My Playlist']);
    });

    test('show returns playlist with videos', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();
        $videos = Video::factory(2)->create();
        $playlist->videos()->attach($videos->pluck('id'));

        $response = $this->actingAs($user)->getJson("/api/playlists/{$playlist->puid}");

        $response->assertOk();
        $response->assertJsonPath('puid', $playlist->puid);
    });

    test('update modifies playlist', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();

        $response = $this->actingAs($user)->patchJson("/api/playlists/{$playlist->puid}", [
            'name' => 'Updated Name',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('playlists', ['id' => $playlist->id, 'name' => 'Updated Name']);
    });

    test('destroy deletes playlist', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();
        $playlistId = $playlist->id;

        $response = $this->actingAs($user)->deleteJson("/api/playlists/{$playlist->puid}");

        $response->assertNoContent();
        $this->assertDatabaseMissing('playlists', ['id' => $playlistId]);
    });

    test('add video to playlist', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();
        $video = Video::factory()->create();

        $response = $this->actingAs($user)->postJson("/api/playlists/{$playlist->puid}/videos", [
            'vuid' => $video->vuid,
        ]);

        $response->assertOk();
        expect($playlist->videos()->where('video_id', $video->id)->exists())->toBeTrue();
    });

    test('remove video from playlist', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();
        $video = Video::factory()->create();
        $playlist->videos()->attach($video->id);

        $response = $this->actingAs($user)->deleteJson("/api/playlists/{$playlist->puid}/videos/{$video->vuid}");

        $response->assertNoContent();
        expect($playlist->videos()->where('video_id', $video->id)->exists())->toBeFalse();
    });
});
