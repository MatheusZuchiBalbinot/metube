<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\VideoPublishingService;
use Illuminate\Console\Command;

/**
 * PublishScheduledVideos — Artisan command to publish scheduled videos.
 *
 * Finds all videos with status=SCHEDULED whose scheduled_at has passed
 * and transitions them to PUBLISHED. Intended to run every minute via
 * the Laravel scheduler.
 */
class PublishScheduledVideos extends Command
{
    /** @var string */
    protected $signature = 'videos:publish-scheduled';

    /** @var string */
    protected $description = 'Publish scheduled videos whose scheduled_at has passed';

    /**
     * Run the command.
     *
     * @param VideoPublishingService $service Video publishing logic
     *
     * @return int Exit code
     */
    public function handle(VideoPublishingService $service): int
    {
        $count = $service->publishDueVideos();

        $this->info("Published {$count} scheduled video(s).");

        return Command::SUCCESS;
    }
}
