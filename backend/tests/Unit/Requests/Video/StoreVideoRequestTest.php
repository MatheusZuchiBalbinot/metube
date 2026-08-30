<?php

declare(strict_types=1);

use App\Http\Requests\Video\StoreVideoRequest;
use Illuminate\Support\Facades\Validator;

describe('StoreVideoRequest', function () {
    test('title is required', function () {
        $validator = Validator::make(
            ['video_file' => 'fake', 'status' => 'published'],
            (new StoreVideoRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('title'))->toBeTrue();
    });

    test('status is required', function () {
        $validator = Validator::make(
            ['title' => 'My Video', 'video_file' => 'fake'],
            (new StoreVideoRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('status'))->toBeTrue();
    });

    test('status must be a valid VideoStatus value', function () {
        $validator = Validator::make(
            ['title' => 'My Video', 'upload_key' => 'key123', 'status' => 'invalid'],
            (new StoreVideoRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('status'))->toBeTrue();
    });

    test('video_file is required when upload_key is absent', function () {
        $validator = Validator::make(
            ['title' => 'My Video', 'status' => 'published'],
            (new StoreVideoRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('video_file'))->toBeTrue();
    });

    test('upload_key is required when video_file is absent', function () {
        $validator = Validator::make(
            ['title' => 'My Video', 'status' => 'published'],
            (new StoreVideoRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('upload_key'))->toBeTrue();
    });

    test('tags cannot exceed 20 items', function () {
        $validator = Validator::make(
            ['title' => 'My Video', 'status' => 'published', 'upload_key' => 'k', 'tags' => array_fill(0, 21, 'tag')],
            (new StoreVideoRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('tags'))->toBeTrue();
    });

    test('upload_key satisfies video_file required_without', function () {
        $validator = Validator::make(
            ['title' => 'My Video', 'status' => 'published', 'upload_key' => 'somekey'],
            (new StoreVideoRequest())->rules(),
        );

        expect($validator->errors()->has('video_file'))->toBeFalse();
    });

    test('thumbnail_file rejects a file larger than 10MB', function () {
        $oversized = Illuminate\Http\UploadedFile::fake()->image('thumb.jpg')->size(10241);

        $validator = Validator::make(
            ['title' => 'My Video', 'status' => 'published', 'upload_key' => 'k', 'thumbnail_file' => $oversized],
            (new StoreVideoRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('thumbnail_file'))->toBeTrue();
    });

    test('thumbnail_file accepts a file at the 10MB limit', function () {
        $atLimit = Illuminate\Http\UploadedFile::fake()->image('thumb.jpg')->size(10240);

        $validator = Validator::make(
            ['title' => 'My Video', 'status' => 'published', 'upload_key' => 'k', 'thumbnail_file' => $atLimit],
            (new StoreVideoRequest())->rules(),
        );

        expect($validator->errors()->has('thumbnail_file'))->toBeFalse();
    });

    test('thumbnail_file rejects a disallowed mime type', function () {
        $svg = Illuminate\Http\UploadedFile::fake()->create('thumb.svg', 10, 'image/svg+xml');

        $validator = Validator::make(
            ['title' => 'My Video', 'status' => 'published', 'upload_key' => 'k', 'thumbnail_file' => $svg],
            (new StoreVideoRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('thumbnail_file'))->toBeTrue();
    });
});
