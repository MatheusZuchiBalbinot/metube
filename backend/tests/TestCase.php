<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // The Docker process environment (APP_ENV=local) can survive phpunit.xml's
        // env overrides via the static Env::$repository singleton. Force the app to
        // recognise it is in a test context so runningUnitTests() returns true.
        $this->app->instance('env', 'testing');

        // Same underlying issue for BROADCAST_CONNECTION: the container's real
        // process env (BROADCAST_CONNECTION=reverb) can win over phpunit.xml's
        // forced "null" once enough tests have booted the app, making a real
        // ShouldBroadcast event try to reach a Reverb server that doesn't exist
        // in this process — surfacing as a Pusher "Not found" BroadcastException
        // in tests that never faked broadcasting.
        config(['broadcasting.default' => 'null']);
    }
}
