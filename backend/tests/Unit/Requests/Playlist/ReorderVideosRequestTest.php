<?php

use App\Http\Requests\Playlist\ReorderVideosRequest;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;

uses(RefreshDatabase::class);

describe('ReorderVideosRequest', function () {
    test('vuids is required', function () {
        $validator = Validator::make([], (new ReorderVideosRequest)->rules());

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('vuids'))->toBeTrue();
    });

    test('vuids must be an array', function () {
        $validator = Validator::make(
            ['vuids' => 'not-an-array'],
            (new ReorderVideosRequest)->rules()
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('vuids'))->toBeTrue();
    });

    test('vuids must have at least one entry', function () {
        $validator = Validator::make(
            ['vuids' => []],
            (new ReorderVideosRequest)->rules()
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('vuids'))->toBeTrue();
    });

    test('each vuid must exist in videos table', function () {
        $validator = Validator::make(
            ['vuids' => ['nonexistent11']],
            (new ReorderVideosRequest)->rules()
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('vuids.0'))->toBeTrue();
    });

    test('valid payload passes', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $validator = Validator::make(
            ['vuids' => [$video->vuid]],
            (new ReorderVideosRequest)->rules()
        );

        expect($validator->fails())->toBeFalse();
    });
});
