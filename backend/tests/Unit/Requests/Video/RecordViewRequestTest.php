<?php

declare(strict_types=1);

use App\Http\Requests\Video\RecordViewRequest;
use Illuminate\Support\Facades\Validator;

describe('RecordViewRequest', function () {
    test('source is optional', function () {
        $validator = Validator::make(
            [],
            (new RecordViewRequest())->rules(),
        );

        expect($validator->errors()->has('source'))->toBeFalse();
    });

    test('source must be a valid VideoSource value when provided', function () {
        $validator = Validator::make(
            ['source' => 'invalid_source'],
            (new RecordViewRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('source'))->toBeTrue();
    });

    test('source accepts valid VideoSource values', function () {
        $validSources = ['feed', 'search', 'channel', 'playlist', 'recommended', 'home'];

        foreach ($validSources as $source) {
            $validator = Validator::make(
                ['source' => $source],
                (new RecordViewRequest())->rules(),
            );

            expect($validator->fails())->toBeFalse()
                ->and($validator->errors()->has('source'))->toBeFalse();
        }
    });

    test('session_id is optional', function () {
        $validator = Validator::make(
            [],
            (new RecordViewRequest())->rules(),
        );

        expect($validator->errors()->has('session_id'))->toBeFalse();
    });

    test('session_id cannot exceed 64 characters', function () {
        $validator = Validator::make(
            ['session_id' => str_repeat('a', 65)],
            (new RecordViewRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('session_id'))->toBeTrue();
    });

    test('valid request passes validation', function () {
        $validator = Validator::make(
            ['source' => 'feed', 'session_id' => 'session123'],
            (new RecordViewRequest())->rules(),
        );

        expect($validator->fails())->toBeFalse();
    });
});
