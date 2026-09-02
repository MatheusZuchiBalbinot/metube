<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\VideoUploadService;
use Illuminate\Console\Command;

/**
 * Intended to run periodically via the Laravel scheduler (see routes/console.php).
 */
class ReconcileStuckProcessingVideos extends Command
{
    /** @var string */
    protected $signature = 'videos:reconcile-stuck-processing {--minutes=240 : Age threshold in minutes}';

    /** @var string */
    protected $description = 'Mark videos stuck in PROCESSING past the grace period as FAILED';

    public function handle(VideoUploadService $service): int
    {
        $minutes = (int) $this->option('minutes');
        $count = $service->reconcileStuckProcessing($minutes);

        $this->info("Reconciled {$count} video(s) stuck in PROCESSING.");

        return Command::SUCCESS;
    }
}
