<?php

declare(strict_types=1);

use App\Http\Requests\Playlist\AddVideoRequest;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;

uses(RefreshDatabase::class);

describe('AddVideoRequest', function () {
    test('vuid is required', function () {
        $validator = Validator::make([], (new AddVideoRequest())->rules());

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('vuid'))->toBeTrue();
    });

    test('vuid must exist in videos table', function () {
        $validator = Validator::make(
            ['vuid' => 'nonexistent11'],
            (new AddVideoRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('vuid'))->toBeTrue();
    });

    test('valid vuid passes', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $validator = Validator::make(
            ['vuid' => $video->vuid],
            (new AddVideoRequest())->rules(),
        );

        expect($validator->fails())->toBeFalse();
    });
});
