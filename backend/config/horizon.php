<?php

use Illuminate\Support\Str;

return [

    'name' => env('HORIZON_NAME', 'Vidsum'),

    'domain' => env('HORIZON_DOMAIN'),

    'path' => env('HORIZON_PATH', 'horizon'),

    'use' => 'default',

    'prefix' => env(
        'HORIZON_PREFIX',
        Str::slug(env('APP_NAME', 'laravel'), '_').'_horizon:'
    ),

    'middleware' => ['web'],

    'waits' => [
        'redis:default' => 60,
        'redis:notifications' => 60,
        'redis:transcription' => 60,
        'redis:analytics' => 60,
    ],

    'trim' => [
        'recent' => 60,
        'pending' => 60,
        'completed' => 60,
        'recent_failed' => 10080,
        'failed' => 10080,
        'monitored' => 10080,
    ],

    'silenced' => [],

    'silenced_tags' => [],

    'metrics' => [
        'trim_snapshots' => [
            'job' => 24,
            'queue' => 24,
        ],
    ],

    'fast_termination' => false,

    'memory_limit' => 64,

    'defaults' => [
        'supervisor-notifications' => [
            'connection' => 'redis',
            'queue' => ['notifications'],
            'balance' => 'auto',
            'autoScalingStrategy' => 'time',
            'maxProcesses' => 3,
            'maxTime' => 0,
            'maxJobs' => 0,
            'memory' => 128,
            'tries' => 3,
            'timeout' => 60,
            'nice' => 0,
        ],
        'supervisor-default' => [
            'connection' => 'redis',
            'queue' => ['default'],
            'balance' => 'auto',
            'autoScalingStrategy' => 'time',
            'maxProcesses' => 3,
            'maxTime' => 0,
            'maxJobs' => 0,
            'memory' => 128,
            'tries' => 3,
            'timeout' => 3600,
            'nice' => 0,
        ],
        'supervisor-transcription' => [
            'connection' => 'redis',
            'queue' => ['transcription'],
            'balance' => false,
            'minProcesses' => env('TRANSCRIPTION_MAX_PROCESSES', 1),
            'maxProcesses' => env('TRANSCRIPTION_MAX_PROCESSES', 1),
            'memory' => 256,
            'tries' => 3,
            'timeout' => 3600,
            'nice' => 0,
        ],
        'supervisor-analytics' => [
            'connection' => 'redis',
            'queue' => ['analytics'],
            'balance' => 'auto',
            'autoScalingStrategy' => 'time',
            'maxProcesses' => 3,
            'maxTime' => 0,
            'maxJobs' => 0,
            'memory' => 128,
            'tries' => 3,
            'timeout' => 120,
            'nice' => 0,
        ],
    ],

    'environments' => [
        'production' => [
            'supervisor-notifications' => [
                'maxProcesses' => 5,
                'balanceMaxShift' => 1,
                'balanceCooldown' => 3,
            ],
            'supervisor-default' => [
                'maxProcesses' => 5,
                'balanceMaxShift' => 1,
                'balanceCooldown' => 3,
            ],
            'supervisor-transcription' => [
                'minProcesses' => env('TRANSCRIPTION_MAX_PROCESSES', 1),
                'maxProcesses' => env('TRANSCRIPTION_MAX_PROCESSES', 1),
            ],
            'supervisor-analytics' => [
                'maxProcesses' => 5,
                'balanceMaxShift' => 1,
                'balanceCooldown' => 3,
            ],
        ],

        'local' => [
            'supervisor-notifications' => [
                'minProcesses' => 1,
                'maxProcesses' => 2,
            ],
            'supervisor-default' => [
                'minProcesses' => 1,
                'maxProcesses' => 2,
            ],
            'supervisor-transcription' => [
                'minProcesses' => env('TRANSCRIPTION_MAX_PROCESSES', 1),
                'maxProcesses' => env('TRANSCRIPTION_MAX_PROCESSES', 1),
            ],
            'supervisor-analytics' => [
                'minProcesses' => 1,
                'maxProcesses' => 2,
            ],
        ],
    ],

];
