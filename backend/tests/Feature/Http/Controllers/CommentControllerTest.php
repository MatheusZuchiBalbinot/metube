<?php

use App\Models\Comment;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

describe('CommentController', function () {
    test('GET /videos/{vuid}/comments returns paginated top-level comments', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        Comment::factory(5)->for($user)->for($video)->create();

        $response = $this->actingAs($user)->getJson("/api/videos/{$video->vuid}/comments");

        $response->assertOk();
        $response->assertJsonCount(5, 'data');
        $response->assertJsonStructure([
            'data' => [['cuid', 'content', 'likes_count', 'replies_count', 'is_liked', 'created_at', 'author']],
        ]);
    });

    test('GET /videos/{vuid}/comments excludes replies from top-level listing', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $parent = Comment::factory()->for($user)->for($video)->create();
        Comment::factory()->for($user)->for($video)->create(['parent_id' => $parent->id]);

        $response = $this->actingAs($user)->getJson("/api/videos/{$video->vuid}/comments");

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
    });

    test('POST /videos/{vuid}/comments stores a top-level comment', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $response = $this->actingAs($user)->postJson("/api/videos/{$video->vuid}/comments", [
            'content' => 'Great video!',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('cuid', fn ($cuid) => strlen($cuid) === 11);
        $this->assertDatabaseHas('comments', [
            'user_id' => $user->id,
            'video_id' => $video->id,
            'content' => 'Great video!',
            'parent_id' => null,
        ]);
    });

    test('POST /videos/{vuid}/comments stores a reply and increments parent replies_count', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $parent = Comment::factory()->for($user)->for($video)->create();

        $response = $this->actingAs($user)->postJson("/api/videos/{$video->vuid}/comments", [
            'content' => 'This is a reply.',
            'parent_cuid' => $parent->cuid,
        ]);

        $response->assertStatus(201);
        $this->assertEquals(1, $parent->fresh()->replies_count);
        $this->assertDatabaseHas('comments', [
            'content' => 'This is a reply.',
            'parent_id' => $parent->id,
        ]);
    });

    test('POST /videos/{vuid}/comments rejects nesting a reply to a reply', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $parent = Comment::factory()->for($user)->for($video)->create();
        $reply = Comment::factory()->for($user)->for($video)->create(['parent_id' => $parent->id]);

        $response = $this->actingAs($user)->postJson("/api/videos/{$video->vuid}/comments", [
            'content' => 'Nested reply.',
            'parent_cuid' => $reply->cuid,
        ]);

        $response->assertStatus(422);
    });

    test('PATCH /comments/{cuid} updates own comment', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $comment = Comment::factory()->for($user)->for($video)->create(['content' => 'Old content.']);

        $response = $this->actingAs($user)->patchJson("/api/comments/{$comment->cuid}", [
            'content' => 'Updated content.',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('comments', [
            'id' => $comment->id,
            'content' => 'Updated content.',
        ]);
    });

    test('PATCH /comments/{cuid} returns 403 when updating another user\'s comment', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->create();
        $comment = Comment::factory()->for($owner)->for($video)->create();

        $this->actingAs($other)
            ->patchJson("/api/comments/{$comment->cuid}", ['content' => 'Hijacked.'])
            ->assertForbidden();
    });

    test('DELETE /comments/{cuid} deletes own comment', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $comment = Comment::factory()->for($user)->for($video)->create();

        $this->actingAs($user)
            ->deleteJson("/api/comments/{$comment->cuid}")
            ->assertNoContent();

        $this->assertDatabaseMissing('comments', ['id' => $comment->id]);
    });

    test('DELETE /comments/{cuid} decrements parent replies_count when deleting a reply', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $parent = Comment::factory()->for($user)->for($video)->create(['replies_count' => 1]);
        $reply = Comment::factory()->for($user)->for($video)->create(['parent_id' => $parent->id]);

        $this->actingAs($user)->deleteJson("/api/comments/{$reply->cuid}")->assertNoContent();

        $this->assertEquals(0, $parent->fresh()->replies_count);
    });

    test('DELETE /comments/{cuid} returns 403 when deleting another user\'s comment', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->create();
        $comment = Comment::factory()->for($owner)->for($video)->create();

        $this->actingAs($other)
            ->deleteJson("/api/comments/{$comment->cuid}")
            ->assertForbidden();
    });

    test('POST /comments/{cuid}/like toggles like on', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $comment = Comment::factory()->for($user)->for($video)->create(['likes_count' => 0]);

        $response = $this->actingAs($user)->postJson("/api/comments/{$comment->cuid}/like");

        $response->assertOk();
        $response->assertJson(['liked' => true, 'likes_count' => 1]);
        $this->assertDatabaseHas('comment_likes', [
            'user_id' => $user->id,
            'comment_id' => $comment->id,
        ]);
    });

    test('POST /comments/{cuid}/like toggles like off when already liked', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $comment = Comment::factory()->for($user)->for($video)->create(['likes_count' => 1]);

        DB::table('comment_likes')->insert([
            'user_id' => $user->id,
            'comment_id' => $comment->id,
            'created_at' => now(),
        ]);

        $response = $this->actingAs($user)->postJson("/api/comments/{$comment->cuid}/like");

        $response->assertOk();
        $response->assertJson(['liked' => false, 'likes_count' => 0]);
        $this->assertDatabaseMissing('comment_likes', [
            'user_id' => $user->id,
            'comment_id' => $comment->id,
        ]);
    });

    test('GET /comments/{cuid}/replies returns replies for a comment', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $parent = Comment::factory()->for($user)->for($video)->create();
        Comment::factory(3)->for($user)->for($video)->create(['parent_id' => $parent->id]);

        $response = $this->actingAs($user)->getJson("/api/comments/{$parent->cuid}/replies");

        $response->assertOk();
        $response->assertJsonCount(3, 'data');
    });

    test('listing comments is accessible to guests', function () {
        $video = Video::factory()->create();
        $this->getJson("/api/videos/{$video->vuid}/comments")->assertOk();
    });

    test('comment write endpoints require authentication', function () {
        $video = Video::factory()->create();
        $comment = Comment::factory()->for(User::factory())->for($video)->create();

        $this->postJson("/api/videos/{$video->vuid}/comments", [])->assertUnauthorized();
        $this->patchJson("/api/comments/{$comment->cuid}", [])->assertUnauthorized();
        $this->deleteJson("/api/comments/{$comment->cuid}")->assertUnauthorized();
        $this->postJson("/api/comments/{$comment->cuid}/like")->assertUnauthorized();
        $this->getJson("/api/comments/{$comment->cuid}/replies")->assertUnauthorized();
    });
});
