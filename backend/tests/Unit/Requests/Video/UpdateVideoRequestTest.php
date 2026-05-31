<?php

declare(strict_types=1);

use App\Http\Requests\Video\UpdateVideoRequest;
use Illuminate\Support\Facades\Validator;

describe('UpdateVideoRequest', function () {
    test('authorize returns true when authenticated', function () {
        expect((new UpdateVideoRequest)->authorize())->toBeFalse();
    });

    test('all fields are optional', function () {
        $validator = Validator::make([], (new UpdateVideoRequest)->rules());
        expect($validator->fails())->toBeFalse();
    });

    test('title cannot exceed 255 characters', function () {
        $validator = Validator::make(
            ['title' => str_repeat('a', 256)],
            (new UpdateVideoRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('title'))->toBeTrue();
    });

    test('description cannot exceed 5000 characters', function () {
        $validator = Validator::make(
            ['description' => str_repeat('a', 5001)],
            (new UpdateVideoRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('description'))->toBeTrue();
    });

    test('tags cannot have more than 20 items', function () {
        $validator = Validator::make(
            ['tags' => array_fill(0, 21, 'tag')],
            (new UpdateVideoRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('tags'))->toBeTrue();
    });

    test('status must be a valid VideoStatus value', function () {
        $validator = Validator::make(
            ['status' => 'invalid-status'],
            (new UpdateVideoRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('status'))->toBeTrue();
    });

    test('valid published status passes', function () {
        $validator = Validator::make(
            ['status' => 'published'],
            (new UpdateVideoRequest)->rules(),
        );

        expect($validator->fails())->toBeFalse();
    });
});
