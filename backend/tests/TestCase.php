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
    }
}
