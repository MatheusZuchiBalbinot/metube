<?php

declare(strict_types=1);

use App\Models\Comment;
use App\Models\User;
use App\Models\Video;

describe('Comment Model', function () {
    test('comment is created with auto-generated cuid', function () {
        $comment = Comment::factory()->create();

        expect($comment->cuid)->not->toBeNull();
        expect(strlen($comment->cuid))->toBeGreaterThan(0);
    });

    test('comment belongs to a user (author)', function () {
        $author = User::factory()->create();
        $comment = Comment::factory()->for($author, 'user')->create();

        expect($comment->user_id)->toBe($author->id);
        expect($comment->user->id)->toBe($author->id);
    });

    test('comment belongs to a video', function () {
        $video = Video::factory()->create();
        $comment = Comment::factory()->for($video, 'video')->create();

        expect($comment->video_id)->toBe($video->id);
        expect($comment->video->id)->toBe($video->id);
    });

    test('comment can have a parent comment (reply)', function () {
        $video = Video::factory()->create();
        $parentComment = Comment::factory()->for($video, 'video')->create();
        $reply = Comment::factory()->for($video, 'video')->create(['parent_id' => $parentComment->id]);

        expect($reply->parent_id)->toBe($parentComment->id);
        expect($reply->parent->id)->toBe($parentComment->id);
    });

    test('comment can have replies', function () {
        $video = Video::factory()->create();
        $parentComment = Comment::factory()->for($video, 'video')->create();
        $reply1 = Comment::factory()->for($video, 'video')->create(['parent_id' => $parentComment->id]);
        $reply2 = Comment::factory()->for($video, 'video')->create(['parent_id' => $parentComment->id]);

        expect($parentComment->replies)->toHaveCount(2);
        expect($parentComment->replies->pluck('id'))->toContain($reply1->id);
        expect($parentComment->replies->pluck('id'))->toContain($reply2->id);
    });

    test('comment can have versions', function () {
        $comment = Comment::factory()->create();

        $version = $comment->versions()->create(['content' => 'old content', 'version' => 1]);

        expect($comment->versions)->toHaveCount(1);
        expect($comment->versions->first()->id)->toBe($version->id);
    });

    test('likes_count and replies_count are cast to integer', function () {
        $comment = Comment::factory()->create(['likes_count' => 5, 'replies_count' => 3]);

        expect($comment->likes_count)->toBe(5);
        expect($comment->replies_count)->toBe(3);
    });

    test('route key name is cuid', function () {
        $comment = Comment::factory()->create();

        expect($comment->getRouteKeyName())->toBe('cuid');
    });

    test('parent comment is null for top-level comments', function () {
        $comment = Comment::factory()->create(['parent_id' => null]);

        expect($comment->parent_id)->toBeNull();
        expect($comment->parent)->toBeNull();
    });
});
