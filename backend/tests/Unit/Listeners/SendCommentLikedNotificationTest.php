<?php

declare(strict_types=1);

use App\Events\CommentLiked;
use App\Listeners\SendCommentLikedNotification;
use App\Models\Comment;
use App\Models\User;
use App\Models\Video;
use App\Notifications\CommentLikedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

describe('SendCommentLikedNotification', function () {
    test('notifies the comment author when a different user likes their comment', function () {
        Notification::fake();

        $author = User::factory()->create();
        $liker = User::factory()->create();
        $video = Video::factory()->for($author, 'channel')->published()->create();
        $comment = Comment::factory()->for($video)->for($author, 'user')->create();

        (new SendCommentLikedNotification)->handle(new CommentLiked($comment, $liker));

        Notification::assertSentTo($author, CommentLikedNotification::class);
    });

    test('does not notify when the liker is the comment author', function () {
        Notification::fake();

        $author = User::factory()->create();
        $video = Video::factory()->for($author, 'channel')->published()->create();
        $comment = Comment::factory()->for($video)->for($author, 'user')->create();

        (new SendCommentLikedNotification)->handle(new CommentLiked($comment, $author));

        Notification::assertNothingSent();
    });
});
