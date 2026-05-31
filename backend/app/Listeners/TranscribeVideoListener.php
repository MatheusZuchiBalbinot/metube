<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\VideoPublished;
use App\Jobs\TranscribeVideo;

/**
 * TranscribeVideoListener — Queue transcription when video is published.
 *
 * High priority: Runs immediately after VideoPublished to start
 * transcription ASAP (before notification listeners).
 */
class TranscribeVideoListener
{
    /**
     * Handle video published event.
     *
     * Dispatches TranscribeVideo job to begin transcription.
     *
     * @param VideoPublished $event Published video
     */
    public function handle(VideoPublished $event): void
    {
        dispatch(new TranscribeVideo($event->video));
    }
}
