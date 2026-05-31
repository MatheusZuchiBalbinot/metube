<?php

declare(strict_types=1);

use App\AI\Clients\IAClient;
use App\AI\Contracts\AiPrompt;
use App\DTOs\VideoMetadataResult;
use App\Services\IAService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;

uses(RefreshDatabase::class);

describe('IAClient', function () {
    test('executes prompt and returns parsed result', function () {
        $mockResponse = [
            'key_points' => ['Point 1'],
            'chapters' => [['timestamp' => '00:01:00', 'title' => 'Intro']],
            'reading_mode' => 'Summary',
            'suggested_tags' => ['tag1'],
            'suggested_title' => 'Title',
            'suggested_description' => 'Description',
        ];

        $mockPrompt = app('Mockery')->mock(AiPrompt::class, function (MockInterface $mock) use ($mockResponse) {
            $mock->shouldReceive('build')->andReturn('Test prompt');
            $mock->shouldReceive('requiredKeys')->andReturn([
                'key_points', 'chapters', 'reading_mode',
                'suggested_tags', 'suggested_title', 'suggested_description',
            ]);
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

        $mockService = app('Mockery')->mock(IAService::class, function (MockInterface $mock) use ($mockResponse) {
            $mock->shouldReceive('generate')
                ->with('Test prompt')
                ->andReturn($mockResponse);
        });

        $client = new IAClient($mockService);
        $result = $client->execute($mockPrompt);

        expect($result)->toBeInstanceOf(VideoMetadataResult::class);
    });

    test('throws RuntimeException when required key is missing', function () {
        $mockResponse = [
            'key_points' => ['Point 1'],
            // missing 'chapters'
            'reading_mode' => 'Summary',
            'suggested_tags' => ['tag1'],
            'suggested_title' => 'Title',
            'suggested_description' => 'Description',
        ];

        $mockPrompt = app('Mockery')->mock(AiPrompt::class, function (MockInterface $mock) {
            $mock->shouldReceive('build')->andReturn('Test prompt');
            $mock->shouldReceive('requiredKeys')->andReturn([
                'key_points', 'chapters', 'reading_mode',
                'suggested_tags', 'suggested_title', 'suggested_description',
            ]);
        });

        $mockService = app('Mockery')->mock(IAService::class, function (MockInterface $mock) use ($mockResponse) {
            $mock->shouldReceive('generate')
                ->andReturn($mockResponse);
        });

        $client = new IAClient($mockService);

        expect(fn () => $client->execute($mockPrompt))
            ->toThrow(RuntimeException::class, "missing required key 'chapters'");
    });
});
