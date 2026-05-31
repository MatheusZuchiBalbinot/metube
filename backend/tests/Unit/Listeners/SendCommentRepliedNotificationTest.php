<?php

declare(strict_types=1);

use App\Events\CommentCreated;
use App\Listeners\SendCommentRepliedNotification;
use App\Models\Comment;
use App\Models\User;
use App\Models\Video;
use App\Notifications\CommentRepliedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

describe('SendCommentRepliedNotification', function () {
    test('notifies the parent comment author when a different user replies', function () {
        Notification::fake();

        $parentAuthor = User::factory()->create();
        $replier = User::factory()->create();
        $video = Video::factory()->for($parentAuthor, 'channel')->published()->create();
        $parent = Comment::factory()->for($video)->for($parentAuthor, 'user')->create();
        $reply = Comment::factory()->for($video)->for($replier, 'user')->create([
            'parent_id' => $parent->id,
        ]);

        (new SendCommentRepliedNotification)->handle(new CommentCreated($reply, $replier, $video, 2));

        Notification::assertSentTo($parentAuthor, CommentRepliedNotification::class);
    });

    test('does not notify when comment is not a reply', function () {
        Notification::fake();

        $author = User::factory()->create();
        $video = Video::factory()->for($author, 'channel')->published()->create();
        $comment = Comment::factory()->for($video)->for($author, 'user')->create(['parent_id' => null]);

        (new SendCommentRepliedNotification)->handle(new CommentCreated($comment, $author, $video, 1));

        Notification::assertNothingSent();
    });

    test('does not notify when the replier is the same user as the parent author', function () {
        Notification::fake();

        $author = User::factory()->create();
        $video = Video::factory()->for($author, 'channel')->published()->create();
        $parent = Comment::factory()->for($video)->for($author, 'user')->create();
        $reply = Comment::factory()->for($video)->for($author, 'user')->create([
            'parent_id' => $parent->id,
        ]);

        (new SendCommentRepliedNotification)->handle(new CommentCreated($reply, $author, $video, 2));

        Notification::assertNothingSent();
    });

    test('does not notify when parent_id points to a deleted parent', function () {
        Notification::fake();

        $author = User::factory()->create();
        $replier = User::factory()->create();
        $video = Video::factory()->for($author, 'channel')->published()->create();
        $parent = Comment::factory()->for($video)->for($author, 'user')->create();
        $reply = Comment::factory()->for($video)->for($replier, 'user')->create([
            'parent_id' => $parent->id,
        ]);

        $parent->delete();

        (new SendCommentRepliedNotification)->handle(new CommentCreated($reply, $replier, $video, 1));

        Notification::assertNothingSent();
    });
});
