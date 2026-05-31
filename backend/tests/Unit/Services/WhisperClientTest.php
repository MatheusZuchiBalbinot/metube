<?php

use App\DTOs\TranscriptionResult;
use App\Exceptions\WhisperException;
use App\Services\WhisperClient;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

describe('WhisperClient', function () {
    test('transcribe sends POST request to Whisper and returns result', function () {
        Http::fake([
            'http://whisper:8001/transcribe' => Http::response([
                'language' => 'pt',
                'text' => 'Olá mundo',
                'vtt' => 'WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nOlá mundo',
            ], 200),
        ]);

        $client = app(WhisperClient::class);
        $result = $client->transcribe('/path/to/video.mp4');

        expect($result)->toBeInstanceOf(TranscriptionResult::class);
        expect($result->language)->toBe('pt');
        expect($result->text)->toBe('Olá mundo');
        expect($result->vtt)->toContain('WEBVTT');

        Http::assertSent(function (Request $request) {
            return $request->method() === 'POST'
                && str_contains($request->url(), '/transcribe')
                && $request['file_path'] === '/path/to/video.mp4'
                && $request['task'] === 'transcribe';
        });
    });

    test('transcribe throws WhisperException on HTTP error', function () {
        Http::fake([
            'http://whisper:8001/transcribe' => Http::response('Internal Server Error', 500),
        ]);

        $client = app(WhisperClient::class);

        expect(fn () => $client->transcribe('/path/to/video.mp4'))
            ->toThrow(WhisperException::class, 'Whisper returned HTTP 500');
    });

    test('transcribe uses custom Whisper URL from config', function () {
        config(['services.whisper.url' => 'http://custom-whisper:9000']);

        Http::fake([
            'http://custom-whisper:9000/transcribe' => Http::response([
                'language' => 'en',
                'text' => 'Hello world',
                'vtt' => 'WEBVTT',
            ], 200),
        ]);

        $client = app(WhisperClient::class);
        $client->transcribe('/path/to/video.mp4');

        Http::assertSent(function (Request $request) {
            return str_contains($request->url(), 'custom-whisper:9000');
        });
    });
});
