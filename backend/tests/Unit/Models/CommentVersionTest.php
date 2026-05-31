<?php

declare(strict_types=1);

use App\Models\Comment;
use App\Models\CommentVersion;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('CommentVersion Model', function () {
    test('version belongs to a comment', function () {
        $comment = Comment::factory()->create();
        $version = CommentVersion::create([
            'comment_id' => $comment->id,
            'content' => 'original content',
            'version' => 1,
        ]);

        expect($version->comment_id)->toBe($comment->id);
        expect($version->comment->id)->toBe($comment->id);
    });

    test('version field is cast to integer', function () {
        $comment = Comment::factory()->create();
        $version = CommentVersion::create([
            'comment_id' => $comment->id,
            'content' => 'some content',
            'version' => 2,
        ]);

        expect($version->version)->toBe(2);
    });

    test('version has expected fillable fields', function () {
        $version = new CommentVersion;
        $fillable = $version->getFillable();

        expect($fillable)->toContain('comment_id');
        expect($fillable)->toContain('content');
        expect($fillable)->toContain('version');
    });

    test('comment can retrieve its versions', function () {
        $comment = Comment::factory()->create();
        CommentVersion::create(['comment_id' => $comment->id, 'content' => 'v1', 'version' => 1]);
        CommentVersion::create(['comment_id' => $comment->id, 'content' => 'v2', 'version' => 2]);

        expect($comment->versions)->toHaveCount(2);
    });

    test('comment version content can be stored and retrieved', function () {
        $comment = Comment::factory()->create();
        $version = CommentVersion::create([
            'comment_id' => $comment->id,
            'content' => 'edited content',
            'version' => 1,
        ]);

        expect($version->content)->toBe('edited content');
        expect($version->comment_id)->toBe($comment->id);
    });
});
