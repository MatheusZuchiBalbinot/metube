<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\VideoPublished;

/**
 * TranscribeVideoListener — intentionally a no-op.
 *
 * Transcription has a SINGLE source of truth: TranscodeVideoToHls::handle dispatches
 * TranscribeVideo once the audio track has been extracted from the source file. That is
 * the only point in the pipeline where the audio Whisper needs actually exists, so it is
 * the correct (and only) place to kick off transcription.
 *
 * This listener used to dispatch TranscribeVideo on VideoPublished as well, which caused a
 * double-transcription race: a video published before its transcode finished could end up
 * with two concurrent Whisper jobs (the COMPLETED guard only deduplicates *after* one of
 * them finishes). It also tended to run before the audio existed, immediately bailing out.
 *
 * The dispatch was removed to leave TranscodeVideoToHls as the single dispatcher. The
 * listener is kept (rather than unregistering it in AppServiceProvider) so the
 * VideoPublished wiring stays untouched and a future publish-time hook has a home.
 * TranscribeVideo also implements ShouldBeUnique as a defense-in-depth backstop.
 */
class TranscribeVideoListener
{
    /**
     * Handle the video published event.
     *
     * Deliberately does nothing: TranscodeVideoToHls owns the TranscribeVideo dispatch.
     *
     * @param VideoPublished $event Published video event (unused)
     */
    public function handle(VideoPublished $event): void
    {
        // No-op. See class docblock: TranscodeVideoToHls is the single dispatcher of
        // TranscribeVideo. Dispatching here would re-introduce the double-transcription race.
    }
}
