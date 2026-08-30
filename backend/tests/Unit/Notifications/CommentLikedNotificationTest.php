<?php

declare(strict_types=1);

use App\Enums\NotificationType;
use App\Models\Comment;
use App\Models\User;
use App\Models\Video;
use App\Notifications\CommentLikedNotification;
use Illuminate\Notifications\Messages\BroadcastMessage;

describe('CommentLikedNotification', function () {
    test('payload includes correct type, liker name, cuid and vuid', function () {
        $author = User::factory()->create();
        $liker = User::factory()->create(['name' => 'Jane Doe']);
        $video = Video::factory()->for($author, 'channel')->published()->create();
        $comment = Comment::factory()->for($video)->for($author, 'user')->create();

        $payload = (new CommentLikedNotification($comment, $liker))->toArray(new stdClass());

        expect($payload['type'])->toBe(NotificationType::COMMENT_LIKED->value)
            ->and($payload['liker_name'])->toBe('Jane Doe')
            ->and($payload['cuid'])->toBe($comment->cuid)
            ->and($payload['vuid'])->toBe($video->vuid);
    });

    test('sends via database and broadcast channels', function () {
        $author = User::factory()->create();
        $liker = User::factory()->create();
        $video = Video::factory()->for($author, 'channel')->published()->create();
        $comment = Comment::factory()->for($video)->for($author, 'user')->create();

        $via = (new CommentLikedNotification($comment, $liker))->via(new stdClass());

        expect($via)->toContain('database')->toContain('broadcast');
    });

    test('toBroadcast returns BroadcastMessage with payload', function () {
        $author = User::factory()->create();
        $liker = User::factory()->create(['name' => 'Jane Doe']);
        $video = Video::factory()->for($author, 'channel')->published()->create();
        $comment = Comment::factory()->for($video)->for($author, 'user')->create();

        $notification = new CommentLikedNotification($comment, $liker);
        $broadcast = $notification->toBroadcast(new stdClass());

        expect($broadcast)->toBeInstanceOf(BroadcastMessage::class)
            ->and($broadcast->data['type'])->toBe(NotificationType::COMMENT_LIKED->value)
            ->and($broadcast->data['liker_name'])->toBe('Jane Doe');
    });
});
