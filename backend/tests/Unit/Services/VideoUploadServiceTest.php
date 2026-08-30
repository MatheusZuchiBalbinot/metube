<?php

declare(strict_types=1);

use App\Contracts\TusResolverContract;
use App\DTOs\CreateVideoDTO;
use App\DTOs\FinalizeUploadDTO;
use App\Enums\VideoStatus;
use App\Jobs\ProcessVideoUpload;
use App\Models\User;
use App\Models\Video;
use App\Services\VideoUploadService;
use Faker\Factory;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * Writes a real file under the fake "local" disk's tus source directory and
 * returns tus metadata pointing at it, mimicking what tus-php would leave
 * behind for a completed upload.
 *
 * @return array<string, mixed>
 */
function fakeTusFileMeta(string $clientFilename, string $contents): array
{
    $sourcePath = Storage::disk('local')->path('uploads/tus-src/' . uniqid() . '_' . $clientFilename);
    @mkdir(dirname($sourcePath), 0777, true);
    file_put_contents($sourcePath, $contents);

    return ['file_path' => $sourcePath, 'name' => $clientFilename];
}

describe('VideoUploadService::finalizeUpload — real content-type verification', function () {
    beforeEach(function () {
        Queue::fake();
        Storage::fake('local');
    });

    test('rejects an assembled file whose real content is HTML despite a video filename', function () {
        $user = User::factory()->create();
        $tusResolver = Mockery::mock(TusResolverContract::class);
        $tusResolver->shouldReceive('get')->once()->andReturn(
            fakeTusFileMeta('clip.mp4', '<html><body><script>alert(document.cookie)</script></body></html>'),
        );
        app()->instance(TusResolverContract::class, $tusResolver);

        $data = new FinalizeUploadDTO(
            uploadKey: 'key-1',
            thumbnailKey: null,
            title: 'Malicious upload',
            description: null,
            tags: [],
            status: VideoStatus::DRAFT,
            scheduledAt: null,
        );

        expect(fn () => app(VideoUploadService::class)->finalizeUpload($user, $data))
            ->toThrow(ValidationException::class);

        $this->assertDatabaseMissing('videos', ['title' => 'Malicious upload']);
        Queue::assertNotPushed(ProcessVideoUpload::class);
    });

    test('accepts an assembled file whose real content is a genuine video', function () {
        $user = User::factory()->create();
        // Minimal but real MP4 "ftyp" box header — enough for finfo to detect video/mp4.
        $mp4Bytes = hex2bin('0000001C6674797069736F6D0000020069736F6D69736F32617663316D703431');
        $tusResolver = Mockery::mock(TusResolverContract::class);
        $tusResolver->shouldReceive('get')->once()->andReturn(
            fakeTusFileMeta('clip.mp4', (string) $mp4Bytes),
        );
        $tusResolver->shouldReceive('delete')->once();
        $tusResolver->shouldReceive('clearOwnerCache')->once();
        app()->instance(TusResolverContract::class, $tusResolver);

        $data = new FinalizeUploadDTO(
            uploadKey: 'key-2',
            thumbnailKey: null,
            title: 'Real upload',
            description: null,
            tags: [],
            status: VideoStatus::DRAFT,
            scheduledAt: null,
        );

        $video = app(VideoUploadService::class)->finalizeUpload($user, $data);

        expect($video->title)->toBe('Real upload');
        Queue::assertPushed(ProcessVideoUpload::class);
    });
});

describe('VideoUploadService — create & delete', function () {
    beforeEach(function () {
        Queue::fake();
        Storage::fake('local');
    });

    test('create video stores data correctly and dispatches upload job', function () {
        $faker = Factory::create();
        $user = User::factory()->create();
        $title = $faker->unique()->sentence(3);
        $description = $faker->paragraph();
        $tags = array_slice($faker->words(5), 0, rand(1, 3));

        $data = new CreateVideoDTO(
            title: $title,
            description: $description,
            tags: $tags,
            status: VideoStatus::DRAFT,
            videoFile: UploadedFile::fake()->create('video.mp4', 1024, 'video/mp4'),
            thumbnailFile: null,
            scheduledAt: null,
        );

        $video = app(VideoUploadService::class)->createVideo($user, $data);

        expect($video->id)->not->toBeNull()
            ->and($video->title)->toBe($title)
            ->and($video->description)->toBe($description)
            ->and($video->channel_id)->toBe($user->id)
            ->and($video->status)->toBe(VideoStatus::PROCESSING);

        Queue::assertPushed(ProcessVideoUpload::class);
    });

    test('delete video removes it from database', function () {
        $video = Video::factory()->create();
        $videoId = $video->id;

        app(VideoUploadService::class)->deleteVideo($video);

        $this->assertDatabaseMissing('videos', ['id' => $videoId]);
    });
});
