<?php

declare(strict_types=1);

use App\Http\Requests\Analytics\LogSearchRequest;
use Illuminate\Support\Facades\Validator;

describe('LogSearchRequest', function () {
    test('query is required', function () {
        $validator = Validator::make(
            ['result_count' => 5],
            (new LogSearchRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('query'))->toBeTrue();
    });

    test('query cannot exceed 200 characters', function () {
        $validator = Validator::make(
            ['query' => str_repeat('a', 201), 'result_count' => 0],
            (new LogSearchRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('query'))->toBeTrue();
    });

    test('result_count is required', function () {
        $validator = Validator::make(
            ['query' => 'cats'],
            (new LogSearchRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('result_count'))->toBeTrue();
    });

    test('result_count cannot be negative', function () {
        $validator = Validator::make(
            ['query' => 'cats', 'result_count' => -1],
            (new LogSearchRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('result_count'))->toBeTrue();
    });

    test('session_id is optional', function () {
        $validator = Validator::make(
            ['query' => 'cats', 'result_count' => 3],
            (new LogSearchRequest())->rules(),
        );

        expect($validator->fails())->toBeFalse();
    });

    test('valid full payload passes', function () {
        $validator = Validator::make(
            ['query' => 'cats', 'result_count' => 10, 'session_id' => 'sess-abc'],
            (new LogSearchRequest())->rules(),
        );

        expect($validator->fails())->toBeFalse();
    });
});
