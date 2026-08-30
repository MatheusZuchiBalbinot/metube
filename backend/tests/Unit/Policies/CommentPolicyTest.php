<?php

declare(strict_types=1);

use App\Models\Comment;
use App\Models\User;
use App\Models\Video;
use App\Policies\CommentPolicy;

describe('CommentPolicy', function () {
    test('update allows comment author to edit', function () {
        $author = User::factory()->create();
        $video = Video::factory()->create();
        $comment = Comment::factory()->for($author, 'user')->for($video, 'video')->create();
        $policy = new CommentPolicy();

        $result = $policy->update($author, $comment);

        expect($result)->toBeTrue();
    });

    test('update denies non-author from editing comment', function () {
        $author = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->create();
        $comment = Comment::factory()->for($author, 'user')->for($video, 'video')->create();
        $policy = new CommentPolicy();

        $result = $policy->update($other, $comment);

        expect($result)->toBeFalse();
    });

    test('delete allows comment author to delete', function () {
        $author = User::factory()->create();
        $video = Video::factory()->create();
        $comment = Comment::factory()->for($author, 'user')->for($video, 'video')->create();
        $policy = new CommentPolicy();

        $result = $policy->delete($author, $comment);

        expect($result)->toBeTrue();
    });

    test('delete denies non-author from deleting comment', function () {
        $author = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->create();
        $comment = Comment::factory()->for($author, 'user')->for($video, 'video')->create();
        $policy = new CommentPolicy();

        $result = $policy->delete($other, $comment);

        expect($result)->toBeFalse();
    });

    test('viewVersions allows the comment author', function () {
        $author = User::factory()->create();
        $channelOwner = User::factory()->create();
        $video = Video::factory()->for($channelOwner, 'channel')->create();
        $comment = Comment::factory()->for($author, 'user')->for($video, 'video')->create();
        $policy = new CommentPolicy();

        $result = $policy->viewVersions($author, $comment);

        expect($result)->toBeTrue();
    });

    test('viewVersions allows the owning channel to moderate', function () {
        $author = User::factory()->create();
        $channelOwner = User::factory()->create();
        $video = Video::factory()->for($channelOwner, 'channel')->create();
        $comment = Comment::factory()->for($author, 'user')->for($video, 'video')->create();
        $policy = new CommentPolicy();

        $result = $policy->viewVersions($channelOwner, $comment);

        expect($result)->toBeTrue();
    });

    test('viewVersions denies unrelated authenticated users', function () {
        $author = User::factory()->create();
        $channelOwner = User::factory()->create();
        $stranger = User::factory()->create();
        $video = Video::factory()->for($channelOwner, 'channel')->create();
        $comment = Comment::factory()->for($author, 'user')->for($video, 'video')->create();
        $policy = new CommentPolicy();

        $result = $policy->viewVersions($stranger, $comment);

        expect($result)->toBeFalse();
    });
});
