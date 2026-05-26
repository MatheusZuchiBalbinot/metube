<?php

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;

uses(RefreshDatabase::class);

describe('UserResource', function () {
    test('toArray includes expected keys', function () {
        $user = User::factory()->create();

        $array = (new UserResource($user))->toArray(new Request);

        expect($array)->toHaveKeys(['uuid', 'name', 'email', 'bio', 'avatar', 'created_at']);
    });

    test('uuid matches the user uuid', function () {
        $user = User::factory()->create();

        $array = (new UserResource($user))->toArray(new Request);

        expect($array['uuid'])->toBe($user->uuid);
    });

    test('email matches the user email', function () {
        $user = User::factory()->create(['email' => 'alice@example.com']);

        $array = (new UserResource($user))->toArray(new Request);

        expect($array['email'])->toBe('alice@example.com');
    });

    test('bio is included in the output', function () {
        $user = User::factory()->create(['bio' => 'Content creator']);

        $array = (new UserResource($user))->toArray(new Request);

        expect($array['bio'])->toBe('Content creator');
    });

    test('created_at is ISO 8601 string', function () {
        $user = User::factory()->create();

        $array = (new UserResource($user))->toArray(new Request);

        expect($array['created_at'])->toMatch('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/');
    });
});
