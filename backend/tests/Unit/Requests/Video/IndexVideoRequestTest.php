<?php

declare(strict_types=1);

use App\Http\Requests\Video\IndexVideoRequest;
use App\Models\User;
use Illuminate\Support\Facades\Validator;

describe('IndexVideoRequest', function () {
    test('authorize allows guests when no status filter is present', function () {
        $request = IndexVideoRequest::create('/api/videos', 'GET');

        expect($request->authorize())->toBeTrue();
    });

    test('authorize allows guests when status is explicitly published', function () {
        $request = IndexVideoRequest::create('/api/videos', 'GET', ['status' => 'published']);

        expect($request->authorize())->toBeTrue();
    });

    test('authorize denies guests requesting a non-published status', function () {
        $request = IndexVideoRequest::create('/api/videos', 'GET', ['status' => 'draft']);

        expect($request->authorize())->toBeFalse();
    });

    test('authorize allows authenticated users requesting a non-published status', function () {
        $this->actingAs(User::factory()->create());
        $request = IndexVideoRequest::create('/api/videos', 'GET', ['status' => 'draft']);

        expect($request->authorize())->toBeTrue();
    });

    test('search cannot exceed 255 characters', function () {
        $validator = Validator::make(
            ['search' => str_repeat('a', 256)],
            (new IndexVideoRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('search'))->toBeTrue();
    });

    test('tags must be an array of strings', function () {
        $validator = Validator::make(
            ['tags' => 'not-an-array'],
            (new IndexVideoRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('tags'))->toBeTrue();
    });

    test('status must be a valid VideoStatus value', function () {
        $validator = Validator::make(
            ['status' => 'not-a-real-status'],
            (new IndexVideoRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('status'))->toBeTrue();
    });

    test('page must be a positive integer', function () {
        $validator = Validator::make(
            ['page' => 0],
            (new IndexVideoRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('page'))->toBeTrue();
    });

    test('empty payload passes validation', function () {
        $validator = Validator::make([], (new IndexVideoRequest())->rules());

        expect($validator->fails())->toBeFalse();
    });
});
