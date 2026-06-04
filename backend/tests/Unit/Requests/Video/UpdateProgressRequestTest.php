<?php

declare(strict_types=1);

use App\Http\Requests\Video\UpdateProgressRequest;
use Illuminate\Support\Facades\Validator;

describe('UpdateProgressRequest', function () {
    test('percent is required', function () {
        $validator = Validator::make([], (new UpdateProgressRequest())->rules());

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('percent'))->toBeTrue();
    });

    test('percent must be an integer', function () {
        $validator = Validator::make(
            ['percent' => 'not-a-number'],
            (new UpdateProgressRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('percent'))->toBeTrue();
    });

    test('percent cannot be negative', function () {
        $validator = Validator::make(
            ['percent' => -1],
            (new UpdateProgressRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('percent'))->toBeTrue();
    });

    test('percent cannot exceed 100', function () {
        $validator = Validator::make(
            ['percent' => 101],
            (new UpdateProgressRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('percent'))->toBeTrue();
    });

    test('percent of 0 is valid', function () {
        $validator = Validator::make(['percent' => 0], (new UpdateProgressRequest())->rules());
        expect($validator->fails())->toBeFalse();
    });

    test('percent of 100 is valid', function () {
        $validator = Validator::make(['percent' => 100], (new UpdateProgressRequest())->rules());
        expect($validator->fails())->toBeFalse();
    });
});
