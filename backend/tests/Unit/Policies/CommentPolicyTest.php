<?php

use App\Models\Comment;
use App\Models\User;
use App\Models\Video;
use App\Policies\CommentPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('CommentPolicy', function () {
    test('update allows comment author to edit', function () {
        $author = User::factory()->create();
        $video = Video::factory()->create();
        $comment = Comment::factory()->for($author, 'user')->for($video, 'video')->create();
        $policy = new CommentPolicy;

        $result = $policy->update($author, $comment);

        expect($result)->toBeTrue();
    });

    test('update denies non-author from editing comment', function () {
        $author = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->create();
        $comment = Comment::factory()->for($author, 'user')->for($video, 'video')->create();
        $policy = new CommentPolicy;

        $result = $policy->update($other, $comment);

        expect($result)->toBeFalse();
    });

    test('delete allows comment author to delete', function () {
        $author = User::factory()->create();
        $video = Video::factory()->create();
        $comment = Comment::factory()->for($author, 'user')->for($video, 'video')->create();
        $policy = new CommentPolicy;

        $result = $policy->delete($author, $comment);

        expect($result)->toBeTrue();
    });

    test('delete denies non-author from deleting comment', function () {
        $author = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->create();
        $comment = Comment::factory()->for($author, 'user')->for($video, 'video')->create();
        $policy = new CommentPolicy;

        $result = $policy->delete($other, $comment);

        expect($result)->toBeFalse();
    });
});
