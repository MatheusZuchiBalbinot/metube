<?php

use App\Services\GeminiService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

describe('GeminiService', function () {
    test('generate returns parsed JSON from Gemini API', function () {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                ['text' => '{"key":"value"}'],
                            ],
                        ],
                    ],
                ],
            ]),
        ]);

        $service = app(GeminiService::class);
        $result = $service->generate('test prompt');

        expect($result)->toBeArray()
            ->and($result['key'])->toBe('value');
    });

    test('generate throws on invalid JSON response', function () {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                ['text' => '{invalid json}'],
                            ],
                        ],
                    ],
                ],
            ]),
        ]);

        $service = app(GeminiService::class);

        expect(fn () => $service->generate('test prompt'))
            ->toThrow(\RuntimeException::class, 'not valid JSON');
    });

    test('generate throws on empty response', function () {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                ['text' => ''],
                            ],
                        ],
                    ],
                ],
            ]),
        ]);

        $service = app(GeminiService::class);

        expect(fn () => $service->generate('test prompt'))
            ->toThrow(\RuntimeException::class, 'empty response');
    });

    test('generate throws on HTTP error', function () {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([], 500),
        ]);

        $service = app(GeminiService::class);

        expect(fn () => $service->generate('test prompt'))
            ->toThrow(RequestException::class);
    });
});
