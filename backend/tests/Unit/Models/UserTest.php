<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('User Model', function () {
    test('user is created with auto-generated uuid', function () {
        $user = User::factory()->create();

        expect($user->uuid)->not->toBeNull();
        expect(strlen($user->uuid))->toBeGreaterThan(0);
    });

    test('user can have many videos', function () {
        $user = User::factory()->create();
        $videoCount = rand(1, 10);
        $videos = App\Models\Video::factory($videoCount)->for($user, 'channel')->create();

        expect($user->videos)->toHaveCount($videoCount);
        $videos->each(fn ($video) => expect($user->videos->pluck('id'))->toContain($video->id));
    });

    test('user automatically gets watch later playlist on creation', function () {
        $user = User::factory()->create();

        $watchLater = $user->getWatchLaterPlaylist();

        expect($watchLater)->not->toBeNull();
        expect($watchLater->name)->toBe('Watch Later');
        expect($watchLater->user_id)->toBe($user->id);
    });

    test('user can have many playlists', function () {
        $user = User::factory()->create();
        $playlistCount = rand(1, 8);
        $playlists = App\Models\Playlist::factory($playlistCount)->for($user)->create();

        // User gets 1 automatic "Watch Later" playlist + created playlists
        expect($user->playlists)->toHaveCount($playlistCount + 1);
        $playlists->each(fn ($playlist) => expect($user->playlists->pluck('id'))->toContain($playlist->id));
    });

    test('user can have watch history', function () {
        $user = User::factory()->create();
        $historyCount = rand(1, 15);
        $videos = App\Models\Video::factory($historyCount)->create();

        $videos->each(fn ($video) => $user->history()->create(['video_id' => $video->id]));

        expect($user->history)->toHaveCount($historyCount);
    });

    test('scope byUuid filters user correctly', function () {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $found = User::byUuid($user1->uuid)->first();

        expect($found)->not->toBeNull();
        expect($found->id)->toBe($user1->id);
        expect($found->id)->not->toBe($user2->id);
    });

    test('user can like videos', function () {
        $user = User::factory()->create();
        $video = App\Models\Video::factory()->create();

        $user->reactions()->attach($video->id, ['type' => 'like']);

        expect($user->likes()->where('video_id', $video->id)->exists())->toBeTrue();
    });

    test('user can dislike videos', function () {
        $user = User::factory()->create();
        $video = App\Models\Video::factory()->create();

        $user->reactions()->attach($video->id, ['type' => 'dislike']);

        expect($user->dislikes()->where('video_id', $video->id)->exists())->toBeTrue();
    });

    test('user can save videos to watch later playlist', function () {
        $user = User::factory()->create();
        $videoCount = rand(1, 10);
        $videos = App\Models\Video::factory($videoCount)->create();
        $watchLater = $user->getWatchLaterPlaylist();

        $videos->each(fn ($video, $index) => $watchLater->videos()->attach($video->id, ['position' => $index]));

        expect($watchLater->videos)->toHaveCount($videoCount);
        $videos->each(fn ($video) => expect($watchLater->videos()->where('video_id', $video->id)->exists())->toBeTrue());
    });
});
