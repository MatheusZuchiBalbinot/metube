<?php

declare(strict_types=1);

use Database\Seeders\Support\DemoTagGenerator;

describe('DemoTagGenerator', function () {
    beforeEach(function () {
        $this->generator = new DemoTagGenerator();
    });

    test('derives topical tags from the title instead of the channel', function () {
        $tags = $this->generator->forTitle('Docker for developers', ['programming', 'javascript', 'tutorial']);

        expect($tags)->toContain('docker')
            ->and($tags)->not->toBe(['programming', 'javascript', 'tutorial']);
    });

    test('matches keywords case-insensitively', function () {
        $tags = $this->generator->forTitle('DOCKER FOR DEVELOPERS', ['programming']);

        expect($tags)->toContain('docker');
    });

    test('unions tags from every keyword that matches', function () {
        $tags = $this->generator->forTitle('React Server Components explained', ['programming']);

        expect($tags)->toContain('react')
            ->and($tags)->toContain('javascript');
    });

    test('falls back to the given tags when no keyword matches', function () {
        $tags = $this->generator->forTitle('Hidden gems under five dollars', ['gaming', 'gameplay', 'review']);

        expect($tags)->toBe(['gaming', 'gameplay', 'review']);
    });

    test('never returns duplicate tags', function () {
        $tags = $this->generator->forTitle('Docker for developers, Docker deep dive', ['programming']);

        expect($tags)->toBe(array_unique($tags));
    });
});
