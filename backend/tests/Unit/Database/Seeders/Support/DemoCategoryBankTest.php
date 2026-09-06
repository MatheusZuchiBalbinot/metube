<?php

declare(strict_types=1);

use Database\Seeders\Support\DemoCategoryBank;

function validBankArgs(): array
{
    return [
        'color' => ['000000', 'ffffff'],
        'icon' => '★',
        'descriptions' => ['One.', 'Two.', 'Three.', 'Four.'],
        'keyPoints' => ['One.', 'Two.', 'Three.', 'Four.'],
        'chapters' => ['One', 'Two', 'Three', 'Four'],
        'comments' => ['One.', 'Two.', 'Three.', 'Four.', 'Five.', 'Six.', 'Seven.', 'Eight.'],
        'closingLines' => ['One.', 'Two.', 'Three.'],
    ];
}

describe('DemoCategoryBank', function () {
    test('accepts a bank that meets every minimum', function () {
        $bank = new DemoCategoryBank(...validBankArgs());

        expect($bank->descriptions)->toHaveCount(4);
    });

    test('rejects a bank with too few descriptions', function () {
        $args = validBankArgs();
        $args['descriptions'] = ['One.', 'Two.'];

        new DemoCategoryBank(...$args);
    })->throws(InvalidArgumentException::class);

    test('rejects a bank with too few comments', function () {
        $args = validBankArgs();
        $args['comments'] = ['One.', 'Two.'];

        new DemoCategoryBank(...$args);
    })->throws(InvalidArgumentException::class);

    test('rejects a bank with too few closing lines', function () {
        $args = validBankArgs();
        $args['closingLines'] = ['One.'];

        new DemoCategoryBank(...$args);
    })->throws(InvalidArgumentException::class);
});
