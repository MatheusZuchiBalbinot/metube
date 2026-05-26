<?php

use App\Http\Requests\Analytics\LogSkipRequest;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;

uses(RefreshDatabase::class);

describe('LogSkipRequest', function () {
    test('vuid is required', function () {
        $validator = Validator::make(
            ['percent' => 50],
            (new LogSkipRequest)->rules()
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('vuid'))->toBeTrue();
    });

    test('vuid must exist in videos table', function () {
        $validator = Validator::make(
            ['vuid' => 'nonexistent11', 'percent' => 50],
            (new LogSkipRequest)->rules()
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('vuid'))->toBeTrue();
    });

    test('percent is required', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $validator = Validator::make(
            ['vuid' => $video->vuid],
            (new LogSkipRequest)->rules()
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('percent'))->toBeTrue();
    });

    test('percent cannot be negative', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $validator = Validator::make(
            ['vuid' => $video->vuid, 'percent' => -1],
            (new LogSkipRequest)->rules()
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('percent'))->toBeTrue();
    });

    test('percent cannot exceed 100', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $validator = Validator::make(
            ['vuid' => $video->vuid, 'percent' => 101],
            (new LogSkipRequest)->rules()
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('percent'))->toBeTrue();
    });

    test('valid payload passes', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $validator = Validator::make(
            ['vuid' => $video->vuid, 'percent' => 42],
            (new LogSkipRequest)->rules()
        );

        expect($validator->fails())->toBeFalse();
    });
});
