// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import CommentSkeleton from '@components/comment/commentSkeleton';

describe('CommentSkeleton', () => {
    it('renders an avatar placeholder and two text placeholders', () => {
        const { container } = render(<CommentSkeleton />);

        expect(container.querySelector('.comment-skeleton')).toBeInTheDocument();
        expect(container.querySelector('.comment-skeleton__avatar')).toHaveClass('skeleton--circle');
        expect(container.querySelector('.comment-skeleton__title')).toBeInTheDocument();
        expect(container.querySelector('.comment-skeleton__text')).toBeInTheDocument();
    });
});
