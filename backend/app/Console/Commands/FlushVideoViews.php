<?php

namespace App\Console\Commands;

use App\Services\ViewCounterService;
use Illuminate\Console\Command;

class FlushVideoViews extends Command
{
    /** @var string */
    protected $signature = 'views:flush';

    /** @var string */
    protected $description = 'Persist buffered Redis view counters to the videos table';

    public function handle(ViewCounterService $service): int
    {
        $updated = $service->flush();
        $this->info("Flushed views for {$updated} videos.");

        return self::SUCCESS;
    }
}
