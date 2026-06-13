<?php

declare(strict_types=1);

use App\Events\VideoPublished;
use App\Jobs\TranscribeVideo;
use App\Listeners\TranscribeVideoListener;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

describe('TranscribeVideoListener', function () {
    test('handle is a no-op and never dispatches TranscribeVideo', function () {
        Queue::fake();

        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        (new TranscribeVideoListener())->handle(new VideoPublished($video));

        // TranscodeVideoToHls is the single dispatcher; the publish-time path must stay silent.
        Queue::assertNotPushed(TranscribeVideo::class);
    });
});
