<?php

use App\Models\User;
use App\Models\UserVideoReaction;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('UserVideoReaction Model', function () {
    test('reaction belongs to a user', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();

        $reaction = UserVideoReaction::create([
            'user_id' => $user->id,
            'video_id' => $video->id,
            'type' => 'like',
        ]);

        expect($reaction->user->id)->toBe($user->id);
    });

    test('reaction belongs to a video', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();

        $reaction = UserVideoReaction::create([
            'user_id' => $user->id,
            'video_id' => $video->id,
            'type' => 'like',
        ]);

        expect($reaction->video->id)->toBe($video->id);
    });

    test('reaction uses correct table', function () {
        $reaction = new UserVideoReaction;

        expect($reaction->table)->toBe('user_video_reactions');
    });

    test('reaction has no timestamps', function () {
        $reaction = new UserVideoReaction;

        expect($reaction->timestamps)->toBeFalse();
    });

    test('reaction type can be like or dislike', function () {
        $user = User::factory()->create();
        $video1 = Video::factory()->create();
        $video2 = Video::factory()->create();

        $like = UserVideoReaction::create([
            'user_id' => $user->id,
            'video_id' => $video1->id,
            'type' => 'like',
        ]);

        $dislike = UserVideoReaction::create([
            'user_id' => $user->id,
            'video_id' => $video2->id,
            'type' => 'dislike',
        ]);

        expect($like->type)->toBe('like');
        expect($dislike->type)->toBe('dislike');
    });
});
