<?php

use App\Enums\LanguageLabel;

describe('LanguageLabel', function () {
    test('label returns Portuguese label for pt', function () {
        expect(LanguageLabel::PT->label())->toBe('Português');
    });

    test('label returns English label for en', function () {
        expect(LanguageLabel::EN->label())->toBe('English');
    });

    test('label returns Spanish label for es', function () {
        expect(LanguageLabel::ES->label())->toBe('Español');
    });

    test('label returns French label for fr', function () {
        expect(LanguageLabel::FR->label())->toBe('Français');
    });

    test('fromLangCode returns label for supported language code', function () {
        expect(LanguageLabel::fromLangCode('pt'))->toBe('Português');
        expect(LanguageLabel::fromLangCode('en'))->toBe('English');
        expect(LanguageLabel::fromLangCode('es'))->toBe('Español');
    });

    test('fromLangCode returns uppercase code for unsupported language', function () {
        expect(LanguageLabel::fromLangCode('unknown'))->toBe('UNKNOWN');
        expect(LanguageLabel::fromLangCode('xy'))->toBe('XY');
    });
});
