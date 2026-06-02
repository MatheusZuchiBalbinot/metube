<?php

declare(strict_types=1);

use App\AI\Clients\GroqClient;
use App\AI\Contracts\AiPrompt;
use App\DTOs\VideoMetadataResult;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Mockery\MockInterface;

describe('GroqClient::execute', function () {
    $mockResponse = [
        'key_points' => ['Point 1'],
        'chapters' => [['timestamp' => '00:01:00', 'title' => 'Intro']],
        'reading_mode' => 'Summary',
        'suggested_tags' => ['tag1'],
        'suggested_title' => 'Title',
        'suggested_description' => 'Description',
    ];

    test('executes prompt and returns parsed result', function () use (&$mockResponse) {
        Http::fake([
            'api.groq.com/*' => Http::response([
                'choices' => [['message' => ['content' => json_encode($mockResponse)]]],
            ]),
        ]);

        $mockPrompt = app('Mockery')->mock(AiPrompt::class, function (MockInterface $mock) use ($mockResponse) {
            $mock->shouldReceive('buildPrompt')->andReturn('Test prompt');
            $mock->shouldReceive('requiredKeys')->andReturn(array_keys($mockResponse));
            $mock->shouldReceive('parse')
                ->with($mockResponse)
                ->andReturn(new VideoMetadataResult(
                    keyPoints: $mockResponse['key_points'],
                    chapters: $mockResponse['chapters'],
                    readingMode: $mockResponse['reading_mode'],
                    suggestedTags: $mockResponse['suggested_tags'],
                    suggestedTitle: $mockResponse['suggested_title'],
                    suggestedDescription: $mockResponse['suggested_description'],
                ));
        });

        $client = app(GroqClient::class);
        $result = $client->execute($mockPrompt);

        expect($result)->toBeInstanceOf(VideoMetadataResult::class);
    });

    test('throws RuntimeException when required key is missing', function () use (&$mockResponse) {
        $incomplete = $mockResponse;
        unset($incomplete['chapters']);

        Http::fake([
            'api.groq.com/*' => Http::response([
                'choices' => [['message' => ['content' => json_encode($incomplete)]]],
            ]),
        ]);

        $mockPrompt = app('Mockery')->mock(AiPrompt::class, function (MockInterface $mock) use ($mockResponse) {
            $mock->shouldReceive('buildPrompt')->andReturn('Test prompt');
            $mock->shouldReceive('requiredKeys')->andReturn(array_keys($mockResponse));
        });

        $client = app(GroqClient::class);

        expect(fn () => $client->execute($mockPrompt))
            ->toThrow(RuntimeException::class, "missing required key 'chapters'");
    });

    test('throws RuntimeException when response is not valid JSON', function () {
        Http::fake([
            'api.groq.com/*' => Http::response([
                'choices' => [['message' => ['content' => '{invalid json}']]],
            ]),
        ]);

        $mockPrompt = app('Mockery')->mock(AiPrompt::class, function (MockInterface $mock) {
            $mock->shouldReceive('buildPrompt')->andReturn('Test prompt');
        });

        $client = app(GroqClient::class);

        expect(fn () => $client->execute($mockPrompt))
            ->toThrow(RuntimeException::class, 'not valid JSON');
    });

    test('throws on HTTP error', function () {
        Http::fake([
            'api.groq.com/*' => Http::response([], 500),
        ]);

        $mockPrompt = app('Mockery')->mock(AiPrompt::class, function (MockInterface $mock) {
            $mock->shouldReceive('buildPrompt')->andReturn('Test prompt');
        });

        $client = app(GroqClient::class);

        expect(fn () => $client->execute($mockPrompt))
            ->toThrow(RequestException::class);
    });
});
