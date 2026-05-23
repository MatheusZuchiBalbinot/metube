// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DragAndDrop from '@ui/dnd/dnd';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

describe('DragAndDrop', () => {
    it('renders upload zone', () => {
        const { container } = render(<DragAndDrop onFileSelect={() => undefined} />);
        expect(container.querySelector('.dnd-zone')).toBeInTheDocument();
    });

    it('renders label when provided', () => {
        render(<DragAndDrop onFileSelect={() => undefined} label="Upload your video" />);
        expect(screen.getByText('Upload your video')).toBeInTheDocument();
    });

    it('renders sublabel when provided', () => {
        render(<DragAndDrop onFileSelect={() => undefined} sublabel="MP4 only" />);
        expect(screen.getByText('MP4 only')).toBeInTheDocument();
    });

    it('calls onFileSelect when a valid file is chosen via input', async () => {
        const onFileSelect = vi.fn();
        render(<DragAndDrop onFileSelect={onFileSelect} accept="video/*" maxSizeMB={500} />);

        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['(video content)'], 'test.mp4', { type: 'video/mp4' });

        await userEvent.upload(input, file);
        expect(onFileSelect).toHaveBeenCalledWith(file);
    });
});
