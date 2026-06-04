<?php

declare(strict_types=1);

use App\Models\Playlist;
use App\Models\User;
use App\Policies\PlaylistPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('PlaylistPolicy', function () {
    test('view allows owner to view playlist', function () {
        $owner = User::factory()->create();
        $playlist = Playlist::factory()->for($owner)->create();
        $policy = new PlaylistPolicy();

        $result = $policy->view($owner, $playlist);

        expect($result)->toBeTrue();
    });

    test('view denies non-owner from viewing playlist', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $playlist = Playlist::factory()->for($owner)->create();
        $policy = new PlaylistPolicy();

        $result = $policy->view($other, $playlist);

        expect($result)->toBeFalse();
    });

    test('update allows owner to update playlist', function () {
        $owner = User::factory()->create();
        $playlist = Playlist::factory()->for($owner)->create();
        $policy = new PlaylistPolicy();

        $result = $policy->update($owner, $playlist);

        expect($result)->toBeTrue();
    });

    test('update denies non-owner from updating playlist', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $playlist = Playlist::factory()->for($owner)->create();
        $policy = new PlaylistPolicy();

        $result = $policy->update($other, $playlist);

        expect($result)->toBeFalse();
    });

    test('delete allows owner to delete playlist', function () {
        $owner = User::factory()->create();
        $playlist = Playlist::factory()->for($owner)->create();
        $policy = new PlaylistPolicy();

        $result = $policy->delete($owner, $playlist);

        expect($result)->toBeTrue();
    });

    test('delete denies non-owner from deleting playlist', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $playlist = Playlist::factory()->for($owner)->create();
        $policy = new PlaylistPolicy();

        $result = $policy->delete($other, $playlist);

        expect($result)->toBeFalse();
    });

    test('addVideo allows owner to add videos to playlist', function () {
        $owner = User::factory()->create();
        $playlist = Playlist::factory()->for($owner)->create();
        $policy = new PlaylistPolicy();

        $result = $policy->addVideo($owner, $playlist);

        expect($result)->toBeTrue();
    });

    test('addVideo denies non-owner from adding videos to playlist', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $playlist = Playlist::factory()->for($owner)->create();
        $policy = new PlaylistPolicy();

        $result = $policy->addVideo($other, $playlist);

        expect($result)->toBeFalse();
    });

    test('removeVideo allows owner to remove videos from playlist', function () {
        $owner = User::factory()->create();
        $playlist = Playlist::factory()->for($owner)->create();
        $policy = new PlaylistPolicy();

        $result = $policy->removeVideo($owner, $playlist);

        expect($result)->toBeTrue();
    });

    test('removeVideo denies non-owner from removing videos from playlist', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $playlist = Playlist::factory()->for($owner)->create();
        $policy = new PlaylistPolicy();

        $result = $policy->removeVideo($other, $playlist);

        expect($result)->toBeFalse();
    });

    test('reorderVideos allows owner to reorder videos in playlist', function () {
        $owner = User::factory()->create();
        $playlist = Playlist::factory()->for($owner)->create();
        $policy = new PlaylistPolicy();

        $result = $policy->reorderVideos($owner, $playlist);

        expect($result)->toBeTrue();
    });

    test('reorderVideos denies non-owner from reordering videos in playlist', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $playlist = Playlist::factory()->for($owner)->create();
        $policy = new PlaylistPolicy();

        $result = $policy->reorderVideos($other, $playlist);

        expect($result)->toBeFalse();
    });
});
