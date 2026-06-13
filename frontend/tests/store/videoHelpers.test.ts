import { describe, it, expect } from 'vitest';
import { moveToFront, toggleReaction } from '@store/videoHelpers';
import type { VideoId } from '@models/video';

const vid = (s: string) => s as unknown as VideoId;

describe('moveToFront', () => {
    it('moves an existing item to the front without duplicating', () => {
        expect(moveToFront(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
    });

    it('prepends an item that is not present yet', () => {
        expect(moveToFront(['a', 'b'], 'z')).toEqual(['z', 'a', 'b']);
    });

    it('is a no-op in content when the item is already first', () => {
        expect(moveToFront(['a', 'b'], 'a')).toEqual(['a', 'b']);
    });

    it('returns a new array (does not mutate the input)', () => {
        const input = ['a', 'b'];
        const result = moveToFront(input, 'b');
        expect(result).not.toBe(input);
        expect(input).toEqual(['a', 'b']);
    });
});

describe('toggleReaction', () => {
    it('adds the id to primary and removes it from opposite', () => {
        const next = toggleReaction([vid('a')], [vid('x')], vid('x'));
        expect(next.primary).toEqual([vid('a'), vid('x')]);
        expect(next.opposite).toEqual([]);
    });

    it('removes the id from primary when already present', () => {
        const next = toggleReaction([vid('a'), vid('x')], [vid('y')], vid('x'));
        expect(next.primary).toEqual([vid('a')]);
    });

    it('leaves opposite untouched when toggling off', () => {
        const opposite = [vid('y')];
        const next = toggleReaction([vid('x')], opposite, vid('x'));
        expect(next.opposite).toBe(opposite);
    });

    it('does not duplicate when adding an id missing from opposite', () => {
        const next = toggleReaction([], [vid('y')], vid('x'));
        expect(next.primary).toEqual([vid('x')]);
        expect(next.opposite).toEqual([vid('y')]);
    });
});
