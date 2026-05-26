<?php

use App\Models\Playlist;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('PlaylistController', function () {
    test('index returns user playlists', function () {
        $user = User::factory()->create();
        Playlist::factory(3)->for($user)->create();

        $response = $this->actingAs($user)->getJson('/api/playlists');

        $response->assertOk();
        // User::boot() creates "Watch Later" playlist automatically, so 3 + 1 = 4
        $response->assertJsonCount(4, 'data');
    });

    test('index returns only playlists belonging to authenticated user', function () {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        Playlist::factory(2)->for($otherUser)->create();

        $response = $this->actingAs($user)->getJson('/api/playlists');

        $response->assertOk();
        // Only the "Watch Later" playlist auto-created for $user
        $response->assertJsonCount(1, 'data');
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

    test('show returns 403 for non-owner', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $playlist = Playlist::factory()->for($owner)->create();

        $response = $this->actingAs($other)->getJson("/api/playlists/{$playlist->puid}");

        $response->assertForbidden();
    });

    test('update renames playlist', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();

        $response = $this->actingAs($user)->patchJson("/api/playlists/{$playlist->puid}", [
            'name' => 'Updated Name',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('playlists', ['id' => $playlist->id, 'name' => 'Updated Name']);
    });

    test('update returns 403 for non-owner', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $playlist = Playlist::factory()->for($owner)->create();

        $response = $this->actingAs($other)->patchJson("/api/playlists/{$playlist->puid}", [
            'name' => 'Hijacked',
        ]);

        $response->assertForbidden();
    });

    test('destroy deletes playlist', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();
        $playlistId = $playlist->id;

        $response = $this->actingAs($user)->deleteJson("/api/playlists/{$playlist->puid}");

        $response->assertNoContent();
        $this->assertDatabaseMissing('playlists', ['id' => $playlistId]);
    });

    test('destroy returns 403 for non-owner', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $playlist = Playlist::factory()->for($owner)->create();
        $playlistId = $playlist->id;

        $response = $this->actingAs($other)->deleteJson("/api/playlists/{$playlist->puid}");

        $response->assertForbidden();
        $this->assertDatabaseHas('playlists', ['id' => $playlistId]);
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

    test('add video returns 403 for non-owner', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $playlist = Playlist::factory()->for($owner)->create();
        $video = Video::factory()->create();

        $response = $this->actingAs($other)->postJson("/api/playlists/{$playlist->puid}/videos", [
            'vuid' => $video->vuid,
        ]);

        $response->assertForbidden();
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

    test('remove video returns 403 for non-owner', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $playlist = Playlist::factory()->for($owner)->create();
        $video = Video::factory()->create();
        $playlist->videos()->attach($video->id);

        $response = $this->actingAs($other)->deleteJson("/api/playlists/{$playlist->puid}/videos/{$video->vuid}");

        $response->assertForbidden();
    });

    test('reorder videos updates positions', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();
        $videoA = Video::factory()->create();
        $videoB = Video::factory()->create();
        $playlist->videos()->attach([$videoA->id => ['position' => 0], $videoB->id => ['position' => 1]]);

        $response = $this->actingAs($user)->putJson("/api/playlists/{$playlist->puid}/videos", [
            'vuids' => [$videoB->vuid, $videoA->vuid],
        ]);

        $response->assertOk();
        $reordered = $playlist->videos()->orderByPivot('position')->get();
        expect($reordered->first()->id)->toBe($videoB->id);
        expect($reordered->last()->id)->toBe($videoA->id);
    });

    test('reorder videos returns 403 for non-owner', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $playlist = Playlist::factory()->for($owner)->create();
        $video = Video::factory()->create();
        $playlist->videos()->attach($video->id);

        $response = $this->actingAs($other)->putJson("/api/playlists/{$playlist->puid}/videos", [
            'vuids' => [$video->vuid],
        ]);

        $response->assertForbidden();
    });

    test('index returns 401 for unauthenticated request', function () {
        $response = $this->getJson('/api/playlists');
        $response->assertUnauthorized();
    });

    test('store returns 401 for unauthenticated request', function () {
        $response = $this->postJson('/api/playlists', ['name' => 'Test']);
        $response->assertUnauthorized();
    });

    test('store returns 422 when name is missing', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/playlists', []);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['name']);
    });

    test('store returns 422 when name exceeds 255 characters', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/playlists', [
            'name' => str_repeat('a', 256),
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['name']);
    });

    test('update returns 401 for unauthenticated request', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();

        $response = $this->patchJson("/api/playlists/{$playlist->puid}", ['name' => 'New Name']);

        $response->assertUnauthorized();
    });

    test('update returns 422 when name is missing', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();

        $response = $this->actingAs($user)->patchJson("/api/playlists/{$playlist->puid}", []);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['name']);
    });

    test('destroy returns 401 for unauthenticated request', function () {
        $user = User::factory()->create();
        $playlist = Playlist::factory()->for($user)->create();

        $response = $this->deleteJson("/api/playlists/{$playlist->puid}");

        $response->assertUnauthorized();
    });
});
