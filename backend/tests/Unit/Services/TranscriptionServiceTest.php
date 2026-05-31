<?php

declare(strict_types=1);

use App\DTOs\TranscriptionResult;
use App\Enums\TranscriptionStatus;
use App\Models\User;
use App\Models\Video;
use App\Services\TranscriptionService;
use App\Services\VideoStorageService;
use App\Services\WhisperClient;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('TranscriptionService', function () {
    test('transcribe saves transcription and captions from Whisper result', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create([
            'video_url' => 'storage/app/public/videos/test.mp4',
            'duration' => 120,
        ]);

        $result = new TranscriptionResult(
            language: 'pt',
            text: 'Olá mundo',
            vtt: 'WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nOlá mundo',
        );

        $mockWhisper = $this->mock(WhisperClient::class)
            ->shouldReceive('transcribe')
            ->with('storage/app/public/videos/test.mp4')
            ->andReturn($result)
            ->getMock();

        $mockStorage = $this->mock(VideoStorageService::class)
            ->shouldReceive('publishCaption')
            ->with($result->vtt, $video->vuid, 'pt')
            ->andReturn('captions/test.pt.vtt')
            ->getMock();

        $service = new TranscriptionService($mockWhisper, $mockStorage);
        $service->transcribe($video);

        $video->refresh();

        expect($video->captions)->toEqual([[
            'lang' => 'pt',
            'label' => 'Português',
            'url' => 'captions/test.pt.vtt',
        ]]);

        expect($video->transcription->status)->toBe(TranscriptionStatus::COMPLETED);
        expect($video->transcription->content)->toBe('Olá mundo');
        expect($video->transcription->language)->toBe('pt');
    });

    test('transcribe uses correct captions path with language code', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create([
            'video_url' => 'storage/app/public/videos/test.mp4',
        ]);

        $result = new TranscriptionResult(
            language: 'en',
            text: 'Hello world',
            vtt: 'WEBVTT',
        );

        $mockWhisper = $this->mock(WhisperClient::class)
            ->shouldReceive('transcribe')
            ->andReturn($result)
            ->getMock();

        $mockStorage = $this->mock(VideoStorageService::class)
            ->shouldReceive('publishCaption')
            ->withArgs(fn ($vtt, $vuid, $lang) => $vuid === $video->vuid && $lang === 'en')
            ->andReturn('captions/test.en.vtt')
            ->getMock();

        $service = new TranscriptionService($mockWhisper, $mockStorage);
        $service->transcribe($video);

        expect($video->refresh()->transcription->language)->toBe('en');
    });
});
