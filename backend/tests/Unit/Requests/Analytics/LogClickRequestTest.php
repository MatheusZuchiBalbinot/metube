<?php

declare(strict_types=1);

use App\Http\Requests\Analytics\LogClickRequest;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;

uses(RefreshDatabase::class);

describe('LogClickRequest', function () {
    test('vuid is required', function () {
        $validator = Validator::make(
            ['source' => 'feed'],
            (new LogClickRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('vuid'))->toBeTrue();
    });

    test('vuid must exist in videos table', function () {
        $validator = Validator::make(
            ['vuid' => 'nonexistent11', 'source' => 'feed'],
            (new LogClickRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('vuid'))->toBeTrue();
    });

    test('source is required', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $validator = Validator::make(
            ['vuid' => $video->vuid],
            (new LogClickRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('source'))->toBeTrue();
    });

    test('source must be a valid VideoSource enum value', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $validator = Validator::make(
            ['vuid' => $video->vuid, 'source' => 'invalid-source'],
            (new LogClickRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('source'))->toBeTrue();
    });

    test('position must be non-negative integer when provided', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $validator = Validator::make(
            ['vuid' => $video->vuid, 'source' => 'feed', 'position' => -1],
            (new LogClickRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('position'))->toBeTrue();
    });

    test('valid payload passes', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $validator = Validator::make(
            ['vuid' => $video->vuid, 'source' => 'feed', 'position' => 2, 'session_id' => 'sess-1'],
            (new LogClickRequest)->rules(),
        );

        expect($validator->fails())->toBeFalse();
    });
});
