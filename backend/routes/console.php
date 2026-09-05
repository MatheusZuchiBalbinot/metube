<?php

declare(strict_types=1);

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('videos:publish-scheduled')->everyMinute()->withoutOverlapping();
Schedule::command('horizon:snapshot')->everyFiveMinutes();
Schedule::command('views:flush')->everyMinute()->withoutOverlapping();
Schedule::command('videos:reconcile-stuck-processing')->hourly()->withoutOverlapping();
Schedule::command('videos:reconcile-stuck-transcriptions')->hourly()->withoutOverlapping();
