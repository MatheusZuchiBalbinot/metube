<?php

declare(strict_types=1);

use App\Http\Requests\User\HistoryRequest;
use Illuminate\Support\Facades\Validator;

describe('HistoryRequest', function () {
    test('period is optional', function () {
        $validator = Validator::make(
            [],
            (new HistoryRequest())->rules(),
        );

        expect($validator->errors()->has('period'))->toBeFalse();
    });

    test('period must be a valid HistoryPeriod value when provided', function () {
        $validator = Validator::make(
            ['period' => 'invalid_period'],
            (new HistoryRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('period'))->toBeTrue();
    });

    test('period accepts valid HistoryPeriod values', function () {
        $validPeriods = ['today', 'week', 'month', 'all'];

        foreach ($validPeriods as $period) {
            $validator = Validator::make(
                ['period' => $period],
                (new HistoryRequest())->rules(),
            );

            expect($validator->fails())->toBeFalse()
                ->and($validator->errors()->has('period'))->toBeFalse();
        }
    });

    test('page is optional and must be a positive integer', function () {
        $validator = Validator::make(
            ['page' => 0],
            (new HistoryRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('page'))->toBeTrue();
    });

    test('page accepts valid positive integers', function () {
        $validator = Validator::make(
            ['page' => 1],
            (new HistoryRequest())->rules(),
        );

        expect($validator->fails())->toBeFalse()
            ->and($validator->errors()->has('page'))->toBeFalse();
    });

    test('perPage is optional and must be between 1 and 100', function () {
        $validator = Validator::make(
            ['perPage' => 101],
            (new HistoryRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('perPage'))->toBeTrue();
    });

    test('perPage accepts valid integers between 1 and 100', function () {
        $validator = Validator::make(
            ['perPage' => 50],
            (new HistoryRequest())->rules(),
        );

        expect($validator->fails())->toBeFalse()
            ->and($validator->errors()->has('perPage'))->toBeFalse();
    });

    test('valid request passes validation', function () {
        $validator = Validator::make(
            ['period' => 'week', 'page' => 1, 'perPage' => 20],
            (new HistoryRequest())->rules(),
        );

        expect($validator->fails())->toBeFalse();
    });
});
