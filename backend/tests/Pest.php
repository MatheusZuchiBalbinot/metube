<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class)->in('Feature', 'Unit');

/**
 * Runs $action $times in sequence and returns each result, standing in for two
 * requests racing on the same code path. PHP test execution is single-threaded, so
 * this proves the class of bug the audit found (a counter or side effect that only
 * checks "does this exist yet" once, incorrectly assuming the check and the write
 * are atomic) rather than reproducing real thread/process timing.
 *
 * @return list<mixed>
 */
function simulateRace(Closure $action, int $times = 2): array
{
    return array_map(static fn () => $action(), range(1, $times));
}
