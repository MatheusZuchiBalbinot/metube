<?php

use App\Events\CommentLiked;
use App\Http\Requests\Comment\StoreCommentRequest;
use App\Http\Requests\Comment\UpdateCommentRequest;
use App\Models\Comment;
use App\Models\User;
use App\Models\Video;
use App\Services\CommentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

describe('CommentService', function () {
    $service = app(CommentService::class);

    beforeEach(function () use (&$service) {
        $service = app(CommentService::class);
    });

    test('list returns paginated top-level comments for a video', function () use (&$service) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        Comment::factory(3)->create(['video_id' => $video->id, 'parent_id' => null]);

        $paginator = $service->list($video->vuid, $user);

        expect($paginator->total())->toBe(3);
    });

    test('list attaches is_liked as false when user has not liked', function () use (&$service) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        Comment::factory()->create(['video_id' => $video->id, 'parent_id' => null]);

        $paginator = $service->list($video->vuid, $user);
        $comment = $paginator->getCollection()->first();

        expect($comment->is_liked)->toBeFalse();
    });

    test('store creates a comment on a video', function () use (&$service) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $request = Mockery::mock(StoreCommentRequest::class);
        $request->shouldReceive('validated')->andReturn(['content' => 'Hello world']);

        $comment = $service->store($video->vuid, $request, $user);

        expect($comment->content)->toBe('Hello world')
            ->and($comment->video_id)->toBe($video->id)
            ->and($comment->user_id)->toBe($user->id);
        $this->assertDatabaseHas('comments', ['content' => 'Hello world', 'video_id' => $video->id]);
    });

    test('store increments video comments_count', function () use (&$service) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['comments_count' => 0]);

        $request = Mockery::mock(StoreCommentRequest::class);
        $request->shouldReceive('validated')->andReturn(['content' => 'A comment']);

        $service->store($video->vuid, $request, $user);

        $this->assertDatabaseHas('videos', ['id' => $video->id, 'comments_count' => 1]);
    });

    test('store creates a reply with parent_id set', function () use (&$service) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $parent = Comment::factory()->create(['video_id' => $video->id, 'parent_id' => null]);

        $request = Mockery::mock(StoreCommentRequest::class);
        $request->shouldReceive('validated')
            ->andReturn(['content' => 'A reply', 'parent_cuid' => $parent->cuid]);

        $reply = $service->store($video->vuid, $request, $user);

        expect($reply->parent_id)->toBe($parent->id);
        $parent->refresh();
        expect($parent->replies_count)->toBe(1);
    });

    test('update modifies comment content and creates a new version', function () use (&$service) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $comment = Comment::factory()->create(['video_id' => $video->id, 'user_id' => $user->id]);

        $request = Mockery::mock(UpdateCommentRequest::class);
        $request->shouldReceive('validated')
            ->with('content')
            ->andReturn('Updated content');

        $updated = $service->update($comment, $request, $user);

        expect($updated->content)->toBe('Updated content')
            ->and($updated->current_version_id)->not->toBeNull();
    });

    test('destroy removes comment from the database', function () use (&$service) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $comment = Comment::factory()->create(['video_id' => $video->id]);

        $service->destroy($comment);

        $this->assertDatabaseMissing('comments', ['id' => $comment->id]);
    });

    test('destroy decrements parent replies_count', function () use (&$service) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $parent = Comment::factory()->create(['video_id' => $video->id, 'replies_count' => 1]);
        $reply = Comment::factory()->create(['video_id' => $video->id, 'parent_id' => $parent->id]);

        $service->destroy($reply);

        $parent->refresh();
        expect($parent->replies_count)->toBe(0);
    });

    test('toggleLike likes a comment and returns liked state', function () use (&$service) {
        Event::fake([CommentLiked::class]);

        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $comment = Comment::factory()->create(['video_id' => $video->id, 'likes_count' => 0]);

        $result = $service->toggleLike($comment, $user);

        expect($result['liked'])->toBeTrue()
            ->and($result['likes_count'])->toBe(1);
    });

    test('toggleLike unlikes a comment that was already liked', function () use (&$service) {
        Event::fake([CommentLiked::class]);

        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $comment = Comment::factory()->create(['video_id' => $video->id, 'likes_count' => 1]);

        \Illuminate\Support\Facades\DB::table('comment_likes')->insert([
            'user_id' => $user->id,
            'comment_id' => $comment->id,
            'created_at' => now(),
        ]);

        $result = $service->toggleLike($comment, $user);

        expect($result['liked'])->toBeFalse()
            ->and($result['likes_count'])->toBe(0);
    });

    test('toggleLike dispatches CommentLiked event when liking', function () use (&$service) {
        Event::fake([CommentLiked::class]);

        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $comment = Comment::factory()->create(['video_id' => $video->id, 'likes_count' => 0]);

        $service->toggleLike($comment, $user);

        Event::assertDispatched(CommentLiked::class);
    });

    test('replies returns all replies for a comment', function () use (&$service) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $parent = Comment::factory()->create(['video_id' => $video->id]);
        Comment::factory(2)->create(['video_id' => $video->id, 'parent_id' => $parent->id]);

        $replies = $service->replies($parent, $user);

        expect($replies->count())->toBe(2);
    });

    test('versions returns all versions of a comment ordered newest first', function () use (&$service) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $comment = Comment::factory()->create(['video_id' => $video->id]);

        \App\Models\CommentVersion::create(['comment_id' => $comment->id, 'content' => 'v1', 'version' => 1]);
        \App\Models\CommentVersion::create(['comment_id' => $comment->id, 'content' => 'v2', 'version' => 2]);

        $versions = $service->versions($comment);

        expect($versions->count())->toBe(2)
            ->and($versions->first()->version)->toBe(2);
    });
});
