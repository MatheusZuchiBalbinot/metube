<?php

declare(strict_types=1);

use App\AI\Clients\GroqClient;
use App\Services\IAService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

describe('IAService', function () {
    test('chat returns plain text answer', function () {
        Http::fake([
            '*' => Http::response([
                'choices' => [
                    ['message' => ['content' => 'The video is about Laravel.']],
                ],
            ]),
        ]);

        $groqClient = app(GroqClient::class);
        $service = new IAService($groqClient);
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

        $groqClient = app(GroqClient::class);
        $service = new IAService($groqClient);
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

        $groqClient = app(GroqClient::class);
        $service = new IAService($groqClient);

        expect(fn () => $service->chat('Question?', 'Context.', []))
            ->toThrow(RuntimeException::class, 'empty response');
    });

    test('chat throws on HTTP error', function () {
        Http::fake([
            '*' => Http::response([], 429),
        ]);

        $groqClient = app(GroqClient::class);
        $service = new IAService($groqClient);

        expect(fn () => $service->chat('Question?', 'Context.', []))
            ->toThrow(RequestException::class);
    });
});
