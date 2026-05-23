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
            <Modal isOpen={false} onClose={() => undefined}>Content</Modal>,
        );
        expect(container.querySelector('.modal-overlay')).toBeNull();
    });

    it('renders modal content when isOpen=true', () => {
        render(
            <Modal isOpen={true} onClose={() => undefined}>Modal body</Modal>,
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
            <Modal isOpen={true} onClose={() => undefined} footer={<span>Footer content</span>}>
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
        render(<Modal isOpen={true} onClose={() => undefined} size="lg">Content</Modal>);
        expect(document.querySelector('.modal-box--lg')).toBeInTheDocument();
    });

    it('calls onClose on Escape key', async () => {
        const onClose = vi.fn();
        render(
            <Modal isOpen={true} onClose={onClose}>Content</Modal>,
        );
        await userEvent.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalled();
    });
});
