// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatSection from '@components/chat/section';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import { makeAuthState, makeRootState, makeUser } from '../../helpers/factories';
import type { VideoTranscription } from '@api';
import type { Vuid } from '@api';
import type * as Api from '@api';

vi.mock('@api', async (importOriginal) => {
    const actual = await importOriginal<typeof Api>();
    return {
        ...actual,
        chat: {
            ask: vi.fn(),
        },
    };
});

const mockVuid = 'test-vuid-1' as unknown as Vuid;

const completedTranscription: VideoTranscription = {
    status: 'completed',
    language: 'en',
    content: 'This is the transcript.',
};

const processingTranscription: VideoTranscription = {
    status: 'processing',
    language: null,
    content: null,
};

function renderChat(transcription: VideoTranscription | null) {
    const preloadedState = makeRootState({
        auth: makeAuthState({ user: makeUser() }),
    });

    return renderWithProviders(
        <ChatSection vuid={mockVuid} transcription={transcription} />,
        { preloadedState },
    );
}

describe('ChatSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders header with AI badge', () => {
        renderChat(completedTranscription);
        expect(screen.getByText('Chat')).toBeInTheDocument();
        expect(screen.getByText('IA')).toBeInTheDocument();
    });

    it('shows unavailable message and no input when transcription is not complete', () => {
        renderChat(processingTranscription);

        expect(screen.getByText(/ficará disponível|will be available/i)).toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('shows unavailable message when transcription is null', () => {
        renderChat(null);

        expect(screen.getByText(/ficará disponível|will be available/i)).toBeInTheDocument();
    });

    it('shows empty state with quick-question chips when transcription is complete', () => {
        renderChat(completedTranscription);

        expect(screen.getByRole('textbox')).toBeInTheDocument();
        expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(1);
    });

    it('send button is disabled when input is empty', () => {
        renderChat(completedTranscription);

        expect(screen.getByRole('button', { name: /send|enviar/i })).toBeDisabled();
    });

    it('send button enables when user types', async () => {
        const user = userEvent.setup();
        renderChat(completedTranscription);

        await user.type(screen.getByRole('textbox'), 'What is this?');

        expect(screen.getByRole('button', { name: /send|enviar/i })).not.toBeDisabled();
    });

    it('clicking a quick-question chip sends that question', async () => {
        const { chat } = await import('@api');
        vi.mocked(chat.ask).mockResolvedValue({ ok: true, data: { answer: 'Answer.' } });

        const user = userEvent.setup();
        renderChat(completedTranscription);

        const chips = screen.getAllByRole('listitem');
        await user.click(chips[0]);

        await waitFor(() => {
            expect(chat.ask).toHaveBeenCalledWith(
                mockVuid,
                expect.objectContaining({ history: [] }),
            );
        });
    });

    it('calls chat.ask with question and empty history on first send', async () => {
        const { chat } = await import('@api');
        vi.mocked(chat.ask).mockResolvedValue({ ok: true, data: { answer: 'Answer.' } });

        const user = userEvent.setup();
        renderChat(completedTranscription);

        await user.type(screen.getByRole('textbox'), 'What is this?');
        await user.click(screen.getByRole('button', { name: /send|enviar/i }));

        await waitFor(() => {
            expect(chat.ask).toHaveBeenCalledWith(
                mockVuid,
                { question: 'What is this?', history: [] },
            );
        });
    });

    it('displays AI response in the message list', async () => {
        const { chat } = await import('@api');
        vi.mocked(chat.ask).mockResolvedValue({ ok: true, data: { answer: 'The video is about testing.' } });

        const user = userEvent.setup();
        renderChat(completedTranscription);

        await user.type(screen.getByRole('textbox'), 'What is this?');
        await user.click(screen.getByRole('button', { name: /send|enviar/i }));

        await waitFor(() => {
            expect(screen.getByText('The video is about testing.')).toBeInTheDocument();
        });
    });

    it('sends conversation history on follow-up', async () => {
        const { chat } = await import('@api');
        vi.mocked(chat.ask)
            .mockResolvedValueOnce({ ok: true, data: { answer: 'First answer.' } })
            .mockResolvedValueOnce({ ok: true, data: { answer: 'Second answer.' } });

        const user = userEvent.setup();
        renderChat(completedTranscription);

        await user.type(screen.getByRole('textbox'), 'First question?');
        await user.click(screen.getByRole('button', { name: /send|enviar/i }));
        await waitFor(() => screen.getByText('First answer.'));

        await user.type(screen.getByRole('textbox'), 'Follow up?');
        await user.click(screen.getByRole('button', { name: /send|enviar/i }));

        await waitFor(() => {
            expect(chat.ask).toHaveBeenLastCalledWith(mockVuid, {
                question: 'Follow up?',
                history: [
                    { role: 'user', content: 'First question?' },
                    { role: 'assistant', content: 'First answer.' },
                ],
            });
        });
    });

    it('shows clear button after first message and clears on click', async () => {
        const { chat } = await import('@api');
        vi.mocked(chat.ask).mockResolvedValue({ ok: true, data: { answer: 'Answer.' } });

        const user = userEvent.setup();
        renderChat(completedTranscription);

        expect(screen.queryByRole('button', { name: /clear|limpar/i })).not.toBeInTheDocument();

        await user.type(screen.getByRole('textbox'), 'Question?');
        await user.click(screen.getByRole('button', { name: /send|enviar/i }));
        await waitFor(() => screen.getByText('Answer.'));

        const clearBtn = screen.getByRole('button', { name: /clear|limpar/i });
        await user.click(clearBtn);

        expect(screen.queryByText('Answer.')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /clear|limpar/i })).not.toBeInTheDocument();
    });

    it('shows error toast when API call fails', async () => {
        const { chat } = await import('@api');
        vi.mocked(chat.ask).mockResolvedValue({ ok: false, error: 'Network error' });

        const user = userEvent.setup();
        const { store } = renderChat(completedTranscription);

        await user.type(screen.getByRole('textbox'), 'What is this?');
        await user.click(screen.getByRole('button', { name: /send|enviar/i }));

        await waitFor(() => {
            expect(store.getState().toast.toasts.length).toBeGreaterThan(0);
        });
    });

    it('disables textarea and send button while loading', async () => {
        const { chat } = await import('@api');
        let resolve!: (v: unknown) => void;
        vi.mocked(chat.ask).mockReturnValue(new Promise(r => {
            resolve = r;
        }));

        const user = userEvent.setup();
        renderChat(completedTranscription);

        await user.type(screen.getByRole('textbox'), 'Question?');
        await user.click(screen.getByRole('button', { name: /send|enviar/i }));

        expect(screen.getByRole('textbox')).toBeDisabled();
        expect(screen.getByRole('button', { name: /send|enviar/i })).toBeDisabled();

        resolve({ ok: true, data: { answer: 'Done.' } });
    });
});
