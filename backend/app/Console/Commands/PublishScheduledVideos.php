<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\VideoPublishingService;
use Illuminate\Console\Command;

/**
 * Intended to run every minute via the Laravel scheduler.
 */
class PublishScheduledVideos extends Command
{
    /** @var string */
    protected $signature = 'videos:publish-scheduled';

    /** @var string */
    protected $description = 'Publish scheduled videos whose scheduled_at has passed';

    public function handle(VideoPublishingService $service): int
    {
        $count = $service->publishDueVideos();

        $this->info("Published {$count} scheduled video(s).");

        return Command::SUCCESS;
    }
}
