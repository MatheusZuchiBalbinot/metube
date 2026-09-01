// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '@ui/modal/modal';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

describe('Modal', () => {
    it('renders nothing when isOpen=false', () => {
        const { container } = render(
            <Modal isOpen={false} onClose={() => undefined} title="Modal">Content</Modal>,
        );
        expect(container.querySelector('.modal-overlay')).toBeNull();
    });

    it('renders modal content when isOpen=true', () => {
        render(
            <Modal isOpen={true} onClose={() => undefined} title="Modal">Modal body</Modal>,
        );
        expect(screen.getByText('Modal body')).toBeInTheDocument();
    });

    it('renders title when provided', () => {
        render(
            <Modal isOpen={true} onClose={() => undefined} title="My Modal">Content</Modal>,
        );
        expect(screen.getByText('My Modal')).toBeInTheDocument();
    });

    it('renders footer when provided', () => {
        render(
            <Modal isOpen={true} onClose={() => undefined} title="Modal" footer={<span>Footer content</span>}>
                Body
            </Modal>,
        );
        expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
        const onClose = vi.fn();
        render(
            <Modal isOpen={true} onClose={onClose} title="Modal">Content</Modal>,
        );
        const closeBtn = screen.getByRole('button', { name: 'common.close' });
        await userEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalled();
    });

    it('applies size class', () => {
        render(<Modal isOpen={true} onClose={() => undefined} title="Modal" size="lg">Content</Modal>);
        expect(document.querySelector('.modal-box--lg')).toBeInTheDocument();
    });

    it('calls onClose on Escape key', async () => {
        const onClose = vi.fn();
        render(
            <Modal isOpen={true} onClose={onClose} title="Modal">Content</Modal>,
        );
        await userEvent.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalled();
    });

    // The follow-up unmount (once the exit animation's `animationend` fires) isn't
    // covered here: jsdom has no AnimationEvent constructor, and React appears to
    // skip registering an animationend listener when it can't detect support for
    // one, so no test-only dispatch reaches the handler in this environment.
    it('stays mounted with a closing class after isOpen flips to false, instead of vanishing instantly', () => {
        const { rerender } = render(
            <Modal isOpen={true} onClose={() => undefined} title="Modal">Content</Modal>,
        );

        rerender(<Modal isOpen={false} onClose={() => undefined} title="Modal">Content</Modal>);

        const overlay = document.querySelector('.modal-overlay');
        expect(overlay).toBeInTheDocument();
        expect(overlay).toHaveClass('modal-overlay--closing');
        expect(document.querySelector('.modal-box--closing')).toBeInTheDocument();
    });

    it('unmounts immediately on close when the viewer prefers reduced motion', () => {
        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: query === '(prefers-reduced-motion: reduce)',
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })) as unknown as typeof window.matchMedia;

        const { rerender } = render(
            <Modal isOpen={true} onClose={() => undefined} title="Modal">Content</Modal>,
        );

        rerender(<Modal isOpen={false} onClose={() => undefined} title="Modal">Content</Modal>);

        expect(document.querySelector('.modal-overlay')).toBeNull();
    });
});
