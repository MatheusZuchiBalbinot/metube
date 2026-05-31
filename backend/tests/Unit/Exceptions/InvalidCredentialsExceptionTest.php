<?php

declare(strict_types=1);

use App\Exceptions\InvalidCredentialsException;

describe('InvalidCredentialsException', function () {
    test('is throwable', function () {
        expect(fn () => throw new InvalidCredentialsException)->toThrow(InvalidCredentialsException::class);
    });

    test('extends base Exception', function () {
        expect(new InvalidCredentialsException)->toBeInstanceOf(Exception::class);
    });

    test('message uses auth.failed translation', function () {
        expect((new InvalidCredentialsException)->getMessage())->toBe(trans('auth.failed'));
    });

    test('code defaults to zero', function () {
        expect((new InvalidCredentialsException)->getCode())->toBe(0);
    });
});
