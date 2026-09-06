<?php

declare(strict_types=1);

use Database\Seeders\Support\DemoCategoryCatalog;
use Database\Seeders\Support\DemoContentGenerator;
use Database\Seeders\Support\DemoVideoContext;

describe('DemoContentGenerator', function () {
    beforeEach(function () {
        $this->generator = new DemoContentGenerator();
        $this->bank = DemoCategoryCatalog::get('programming');
    });

    test('two videos in the same category get different descriptions', function () {
        $a = new DemoVideoContext('programming', 'Build a REST API in 20 minutes', 0, []);
        $b = new DemoVideoContext('programming', 'Debugging like a pro', 1, []);

        $descriptionA = $this->generator->description($a, $this->bank);
        $descriptionB = $this->generator->description($b, $this->bank);

        expect($descriptionA)->not->toBe($descriptionB);
    });

    test('two videos in the same category get different comment picks', function () {
        $a = new DemoVideoContext('programming', 'Build a REST API in 20 minutes', 0, []);
        $b = new DemoVideoContext('programming', 'Debugging like a pro', 1, []);

        $commentsA = $this->generator->comments($a, $this->bank, 4);
        $commentsB = $this->generator->comments($b, $this->bank, 4);

        expect($commentsA)->not->toBe($commentsB);
    });

    test('description interpolates the real title, not a placeholder', function () {
        $context = new DemoVideoContext('programming', 'Build a REST API in 20 minutes', 0, []);

        $description = $this->generator->description($context, $this->bank, count($this->bank->descriptions));

        expect($description)->toContain('Build a REST API in 20 minutes')
            ->and($description)->not->toContain('{title}');
    });

    test('regenerating content for the same context is byte-identical (idempotent re-seeding)', function () {
        $context = new DemoVideoContext('programming', 'Build a REST API in 20 minutes', 0, []);

        $first = $this->generator->description($context, $this->bank);
        $second = $this->generator->description($context, $this->bank);

        expect($first)->toBe($second);

        $firstComments = $this->generator->comments($context, $this->bank, 5);
        $secondComments = $this->generator->comments($context, $this->bank, 5);

        expect($firstComments)->toBe($secondComments);
    });

    test('the seed only depends on category and title, not the mutable index', function () {
        // makeVideo() computes a context at creation time (with whatever $index
        // the cursor happens to be at), but seedAiLayer() and seedComments()
        // rebuild a context for the same video later with an unrelated index —
        // both must land on the same generated content for a video's
        // description, summary and transcript to actually agree with each other.
        $atCreation = new DemoVideoContext('programming', 'Build a REST API in 20 minutes', 3, []);
        $laterPass = new DemoVideoContext('programming', 'Build a REST API in 20 minutes', 47, []);

        expect($this->generator->description($atCreation, $this->bank))
            ->toBe($this->generator->description($laterPass, $this->bank));
    });

    test('chapters always start with the bank\'s intro chapter', function () {
        $context = new DemoVideoContext('programming', 'Testing without the tears', 0, []);

        $chapters = $this->generator->chapters($context, $this->bank, 600.0);

        expect($chapters[0]['title'])->toBe($this->bank->chapters[0])
            ->and($chapters[0]['timestamp'])->toBe('0:00');
    });

    test('comments never request more than the bank has', function () {
        $context = new DemoVideoContext('meta', 'Welcome to MeTube', 0, []);
        $bank = DemoCategoryCatalog::get('meta');

        $comments = $this->generator->comments($context, $bank, 1000);

        expect($comments)->toHaveCount(count($bank->comments))
            ->and($comments)->each->toBeString();
    });
});
