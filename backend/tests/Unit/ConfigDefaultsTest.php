<?php

declare(strict_types=1);

/**
 * Evaluate a config file in isolation with the given env vars cleared so that
 * `env()` falls back to the literal default baked into the config file.
 *
 * The test environment (phpunit.xml) forces CACHE_STORE=array and
 * QUEUE_CONNECTION=sync, which would otherwise mask the file's default. By
 * unsetting those vars around a fresh `require` we assert the literal fallback.
 *
 * @param list<string> $clearEnvKeys
 *
 * @return array<string, mixed>
 */
function loadConfigWithDefaults(string $relativePath, array $clearEnvKeys): array
{
    $previous = [];

    foreach ($clearEnvKeys as $key) {
        $previous[$key] = $_SERVER[$key] ?? null;
        unset($_SERVER[$key], $_ENV[$key]);
        putenv($key);
    }

    try {
        $config = require base_path($relativePath);

        return is_array($config) ? $config : [];
    } finally {
        foreach ($clearEnvKeys as $key) {
            $value = $previous[$key];

            if ($value === null) {
                continue;
            }

            $_SERVER[$key] = $value;
            $_ENV[$key] = $value;
            putenv("{$key}={$value}");
        }
    }
}

describe('config defaults', function () {
    test('cache default falls back to redis when CACHE_STORE is unset', function () {
        $config = loadConfigWithDefaults('config/cache.php', ['CACHE_STORE']);

        expect($config['default'])->toBe('redis');
    });

    test('queue default falls back to redis when QUEUE_CONNECTION is unset', function () {
        $config = loadConfigWithDefaults('config/queue.php', ['QUEUE_CONNECTION']);

        expect($config['default'])->toBe('redis');
    });

    test('octane max_execution_time is 60', function () {
        expect(config('octane.max_execution_time'))->toBe(60);
    });
});
