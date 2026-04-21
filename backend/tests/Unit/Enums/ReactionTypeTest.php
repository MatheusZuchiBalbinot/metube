<?php

use App\Enums\ReactionType;

describe('ReactionType Enum', function () {
    test('all reaction types have correct values', function () {
        expect(ReactionType::LIKE->value)->toBe('like');
        expect(ReactionType::DISLIKE->value)->toBe('dislike');
    });

    test('values method returns all reaction type values', function () {
        $values = ReactionType::values();

        expect($values)->toHaveCount(2);
        expect($values)->toContain('like', 'dislike');
    });

    test('opposite returns correct opposite reaction', function () {
        expect(ReactionType::LIKE->opposite())->toBe(ReactionType::DISLIKE);
        expect(ReactionType::DISLIKE->opposite())->toBe(ReactionType::LIKE);
    });
});
