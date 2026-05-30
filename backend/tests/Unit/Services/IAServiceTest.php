<?php

use App\Services\IAService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

describe('IAService', function () {
    function groqJsonResponse(string $text): array
    {
        return [
            'choices' => [
                ['message' => ['content' => $text]],
            ],
        ];
    }

    test('generate returns parsed JSON from AI API', function () {
        Http::fake([
            '*' => Http::response(groqJsonResponse('{"key":"value"}')),
        ]);

        $service = app(IAService::class);
        $result = $service->generate('test prompt');

        expect($result)->toBeArray()
            ->and($result['key'])->toBe('value');
    });

    test('generate throws on invalid JSON response', function () {
        Http::fake([
            '*' => Http::response(groqJsonResponse('{invalid json}')),
        ]);

        $service = app(IAService::class);

        expect(fn () => $service->generate('test prompt'))
            ->toThrow(\RuntimeException::class, 'not valid JSON');
    });

    test('generate throws on empty response', function () {
        Http::fake([
            '*' => Http::response(groqJsonResponse('')),
        ]);

        $service = app(IAService::class);

        expect(fn () => $service->generate('test prompt'))
            ->toThrow(\RuntimeException::class, 'empty response');
    });

    test('generate throws on HTTP error', function () {
        Http::fake([
            '*' => Http::response([], 500),
        ]);

        $service = app(IAService::class);

        expect(fn () => $service->generate('test prompt'))
            ->toThrow(RequestException::class);
    });

    test('chat returns plain text answer', function () {
        Http::fake([
            '*' => Http::response([
                'choices' => [
                    ['message' => ['content' => 'The video is about Laravel.']],
                ],
            ]),
        ]);

        $service = app(IAService::class);
        $answer = $service->chat('What is this about?', 'System context here.', []);

        expect($answer)->toBe('The video is about Laravel.');
    });

    test('chat includes history in the request', function () {
        Http::fake([
            '*' => Http::response([
                'choices' => [
                    ['message' => ['content' => 'Yes, exactly.']],
                ],
            ]),
        ]);

        $history = [
            ['role' => 'user', 'content' => 'Is it about PHP?'],
            ['role' => 'assistant', 'content' => 'Yes, PHP and Laravel.'],
        ];

        $service = app(IAService::class);
        $answer = $service->chat('Anything else?', 'Context.', $history);

        Http::assertSent(function ($request) use ($history) {
            $messages = $request->data()['messages'];

            // system + 2 history + 1 user = 4 messages
            return count($messages) === 4
                && $messages[0]['role'] === 'system'
                && $messages[1] === $history[0]
                && $messages[2] === $history[1]
                && $messages[3]['role'] === 'user'
                && $messages[3]['content'] === 'Anything else?';
        });

        expect($answer)->toBe('Yes, exactly.');
    });

    test('chat throws on empty response', function () {
        Http::fake([
            '*' => Http::response([
                'choices' => [
                    ['message' => ['content' => '']],
                ],
            ]),
        ]);

        $service = app(IAService::class);

        expect(fn () => $service->chat('Question?', 'Context.', []))
            ->toThrow(\RuntimeException::class, 'empty chat response');
    });

    test('chat throws on HTTP error', function () {
        Http::fake([
            '*' => Http::response([], 429),
        ]);

        $service = app(IAService::class);

        expect(fn () => $service->chat('Question?', 'Context.', []))
            ->toThrow(RequestException::class);
    });
});
