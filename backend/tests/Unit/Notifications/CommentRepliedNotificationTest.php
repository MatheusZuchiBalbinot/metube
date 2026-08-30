<?php

declare(strict_types=1);

use App\Enums\NotificationType;
use App\Models\Comment;
use App\Models\User;
use App\Models\Video;
use App\Notifications\CommentRepliedNotification;
use Illuminate\Notifications\Messages\BroadcastMessage;

describe('CommentRepliedNotification', function () {
    test('payload includes correct type, replier name, cuid and vuid', function () {
        $author = User::factory()->create();
        $replier = User::factory()->create(['name' => 'John Smith']);
        $video = Video::factory()->for($author, 'channel')->published()->create();
        $parent = Comment::factory()->for($video)->for($author, 'user')->create();
        $reply = Comment::factory()->for($video)->for($replier, 'user')->create([
            'parent_id' => $parent->id,
        ]);

        $payload = (new CommentRepliedNotification($reply, $replier))->toArray(new stdClass());

        expect($payload['type'])->toBe(NotificationType::COMMENT_REPLIED->value)
            ->and($payload['replier_name'])->toBe('John Smith')
            ->and($payload['cuid'])->toBe($reply->cuid)
            ->and($payload['vuid'])->toBe($video->vuid);
    });

    test('sends via database and broadcast channels', function () {
        $author = User::factory()->create();
        $replier = User::factory()->create();
        $video = Video::factory()->for($author, 'channel')->published()->create();
        $parent = Comment::factory()->for($video)->for($author, 'user')->create();
        $reply = Comment::factory()->for($video)->for($replier, 'user')->create([
            'parent_id' => $parent->id,
        ]);

        $via = (new CommentRepliedNotification($reply, $replier))->via(new stdClass());

        expect($via)->toContain('database')->toContain('broadcast');
    });

    test('toBroadcast returns BroadcastMessage with payload', function () {
        $author = User::factory()->create();
        $replier = User::factory()->create(['name' => 'John Smith']);
        $video = Video::factory()->for($author, 'channel')->published()->create();
        $parent = Comment::factory()->for($video)->for($author, 'user')->create();
        $reply = Comment::factory()->for($video)->for($replier, 'user')->create([
            'parent_id' => $parent->id,
        ]);

        $notification = new CommentRepliedNotification($reply, $replier);
        $broadcast = $notification->toBroadcast(new stdClass());

        expect($broadcast)->toBeInstanceOf(BroadcastMessage::class)
            ->and($broadcast->data['type'])->toBe(NotificationType::COMMENT_REPLIED->value)
            ->and($broadcast->data['replier_name'])->toBe('John Smith');
    });
});
