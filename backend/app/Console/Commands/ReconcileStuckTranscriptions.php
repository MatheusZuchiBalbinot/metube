<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\AiMetadataService;
use Illuminate\Console\Command;

/**
 * Intended to run periodically via the Laravel scheduler (see routes/console.php).
 */
class ReconcileStuckTranscriptions extends Command
{
    /** @var string */
    protected $signature = 'videos:reconcile-stuck-transcriptions {--minutes=60 : Age threshold in minutes}';

    /** @var string */
    protected $description = 'Redispatch GenerateAiMetadata for videos whose transcription completed but never produced AI metadata';

    public function handle(AiMetadataService $service): int
    {
        $minutes = (int) $this->option('minutes');
        $count = $service->reconcileStuckMetadata($minutes);

        $this->info("Reconciled {$count} video(s) stuck after transcription.");

        return Command::SUCCESS;
    }
}
