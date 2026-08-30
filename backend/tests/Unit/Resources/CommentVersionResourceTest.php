<?php

declare(strict_types=1);

use App\Http\Resources\CommentVersionResource;
use App\Models\Comment;
use App\Models\CommentVersion;
use App\Models\User;
use App\Models\Video;
use Illuminate\Http\Request;

describe('CommentVersionResource', function () {
    test('toArray includes version, content, and created_at', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $comment = Comment::factory()->for($video)->for($user, 'user')->create();
        $version = CommentVersion::create([
            'comment_id' => $comment->id,
            'version' => 1,
            'content' => 'Original content',
        ]);

        $resource = new CommentVersionResource($version);
        $array = $resource->toArray(new Request());

        expect($array)->toHaveKey('version')
            ->and($array)->toHaveKey('content')
            ->and($array)->toHaveKey('created_at')
            ->and($array['version'])->toBe(1)
            ->and($array['content'])->toBe('Original content');
    });

    test('created_at is formatted as ISO 8601', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $comment = Comment::factory()->for($video)->for($user, 'user')->create();
        $version = CommentVersion::create([
            'comment_id' => $comment->id,
            'version' => 1,
            'content' => 'Content',
        ]);

        $resource = new CommentVersionResource($version);
        $array = $resource->toArray(new Request());

        expect($array['created_at'])->toMatch('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/');
    });

    test('collection wraps multiple versions', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $comment = Comment::factory()->for($video)->for($user, 'user')->create();

        CommentVersion::create(['comment_id' => $comment->id, 'version' => 1, 'content' => 'v1']);
        CommentVersion::create(['comment_id' => $comment->id, 'version' => 2, 'content' => 'v2']);

        $collection = CommentVersionResource::collection(CommentVersion::all());

        expect($collection)->toHaveCount(2);
    });
});
