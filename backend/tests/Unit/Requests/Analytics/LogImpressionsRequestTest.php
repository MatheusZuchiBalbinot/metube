<?php

use App\Http\Requests\Analytics\LogImpressionsRequest;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;

uses(RefreshDatabase::class);

describe('LogImpressionsRequest', function () {
    test('vuids is required', function () {
        $validator = Validator::make(
            ['source' => 'feed'],
            (new LogImpressionsRequest)->rules()
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('vuids'))->toBeTrue();
    });

    test('vuids must be a non-empty array', function () {
        $validator = Validator::make(
            ['vuids' => [], 'source' => 'feed'],
            (new LogImpressionsRequest)->rules()
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('vuids'))->toBeTrue();
    });

    test('vuids cannot contain more than 100 entries', function () {
        $validator = Validator::make(
            ['vuids' => array_fill(0, 101, 'x'), 'source' => 'feed'],
            (new LogImpressionsRequest)->rules()
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('vuids'))->toBeTrue();
    });

    test('source is required', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $validator = Validator::make(
            ['vuids' => [$video->vuid]],
            (new LogImpressionsRequest)->rules()
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('source'))->toBeTrue();
    });

    test('source must be a valid VideoSource enum', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $validator = Validator::make(
            ['vuids' => [$video->vuid], 'source' => 'bad-source'],
            (new LogImpressionsRequest)->rules()
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('source'))->toBeTrue();
    });

    test('valid payload passes', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $validator = Validator::make(
            ['vuids' => [$video->vuid], 'source' => 'feed', 'session_id' => 'sess-1'],
            (new LogImpressionsRequest)->rules()
        );

        expect($validator->fails())->toBeFalse();
    });
});
