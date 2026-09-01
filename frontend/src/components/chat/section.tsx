import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, SendHorizontal, X } from '@components/icons/icons';
import type { VideoTranscription, Vuid } from '@api';
import { chat as chatApi } from '@api';
import type { ChatMessage } from '@api';
import { Button, Tooltip } from '@ui';
import { domain } from '@domain';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import { ToastType } from '@enums/toastType';
import './section.css';

interface ChatSectionProps {
    vuid: Vuid
    transcription: VideoTranscription | null
}

interface ChatEntry {
    id: string
    role: 'user' | 'assistant'
    content: string
}

const QUICK_QUESTIONS = ['chat.quick_q1', 'chat.quick_q2', 'chat.quick_q3'] as const;

// Keep at most this many messages mounted; older ones drop off the top so a
// long conversation can't grow the DOM unbounded (no virtualization library).
const MAX_RENDERED_MESSAGES = 80;

let messageIdSeq = 0;

function nextMessageId(): string {
    messageIdSeq += 1;
    return `msg-${messageIdSeq}`;
}

function TypingIndicator() {
    return (
        <div className="chat-section__bubble chat-section__bubble--ai">
            <span className="chat-section__ai-badge" aria-hidden="true">
                <Sparkles size={11} />
            </span>
            <div className="chat-section__typing">
                <span className="chat-section__dot" />
                <span className="chat-section__dot" />
                <span className="chat-section__dot" />
            </div>
        </div>
    );
}

function UserBubble({ content }: { content: string }) {
    return (
        <div className="chat-section__bubble chat-section__bubble--user">
            <p className="chat-section__bubble-text">{content}</p>
        </div>
    );
}

function AiBubble({ content }: { content: string }) {
    return (
        <div className="chat-section__bubble chat-section__bubble--ai">
            <span className="chat-section__ai-badge" aria-hidden="true">
                <Sparkles size={11} />
            </span>
            <p className="chat-section__bubble-text">{content}</p>
        </div>
    );
}

// Owns the whole chat flow (transcription-readiness gate, loading/empty states,
// send-message + quick-question handlers) in one component; splitting it would just move
// the same branches into props threaded back down, not remove them.
// eslint-disable-next-line complexity
export default function ChatSection({ vuid, transcription }: ChatSectionProps) {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [messages, setMessages] = useState<ChatEntry[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const isTranscriptionReady = transcription !== null && domain.transcription.isCompleted(transcription);
    const hasMessages = messages.length > 0;

    useEffect(() => {
        const el = listRef.current;
        if (!el) {
            return;
        }
        el.scrollTop = el.scrollHeight;
    }, [messages, loading]);

    function growTextarea() {
        const el = textareaRef.current;
        if (!el) {
            return;
        }
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }

    const sendMessage = useCallback(async (question: string) => {
        const trimmed = question.trim();

        if (trimmed === '' || loading) {
            return;
        }

        setMessages(prev => [...prev, { id: nextMessageId(), role: 'user', content: trimmed }]);
        setInput('');
        setLoading(true);

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        const history: ChatMessage[] = messages.map(m => ({ role: m.role, content: m.content }));
        const result = await chatApi.ask(vuid, { question: trimmed, history });

        setLoading(false);

        if (!result.ok) {
            dispatch(toastActions.addToast({ message: t('chat.error'), type: ToastType.ERROR }));
            return;
        }

        setMessages(prev => [...prev, { id: nextMessageId(), role: 'assistant', content: result.data.answer }]);
    }, [loading, messages, vuid, dispatch, t]);

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        const isEnterWithoutShift = e.key === 'Enter' && !e.shiftKey;
        if (!isEnterWithoutShift) {
            return;
        }
        e.preventDefault();
        void sendMessage(input);
    }

    function handleQuickQuestion(key: string) {
        void sendMessage(t(key));
    }

    function handleClear() {
        setMessages([]);
    }

    return (
        <div className="chat-section">
            <div className="chat-section__header">
                <div className="chat-section__header-left">
                    <Sparkles size={14} className="chat-section__header-icon" aria-hidden="true" />
                    <span className="chat-section__header-title">{t('chat.header')}</span>
                    <span className="chat-section__header-badge">IA</span>
                </div>
                {hasMessages && (
                    <Tooltip content={t('chat.clear')} side="left">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="chat-section__clear-btn"
                            onClick={handleClear}
                            aria-label={t('chat.clear')}
                            leftIcon={<X size={13} />}
                        />
                    </Tooltip>
                )}
            </div>

            <div className="chat-section__list" ref={listRef}>
                {!hasMessages && !loading && (
                    <div className="chat-section__empty">
                        {isTranscriptionReady ? (
                            <>
                                <p className="chat-section__empty-text">{t('chat.empty')}</p>
                                <div className="chat-section__chips" role="list">
                                    {QUICK_QUESTIONS.map(key => (
                                        <button
                                            key={key}
                                            type="button"
                                            role="listitem"
                                            className="chat-section__chip"
                                            onClick={() => handleQuickQuestion(key)}
                                        >
                                            {t(key)}
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="chat-section__empty-text">{t('chat.unavailable')}</p>
                        )}
                    </div>
                )}

                {messages.slice(-MAX_RENDERED_MESSAGES).map(msg => (
                    msg.role === 'user'
                        ? <UserBubble key={msg.id} content={msg.content} />
                        : <AiBubble key={msg.id} content={msg.content} />
                ))}

                {loading && <TypingIndicator />}
            </div>

            {isTranscriptionReady && (
                <div className="chat-section__input-row">
                    <div className="chat-section__input-wrap">
                        <textarea
                            ref={textareaRef}
                            className="chat-section__textarea"
                            rows={1}
                            placeholder={t('chat.placeholder')}
                            value={input}
                            onChange={e => {
                                setInput(e.target.value);
                                growTextarea();
                            }}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                            aria-label={t('chat.placeholder')}
                        />
                        <span className="chat-section__hint">
                            Enter {t('chat.send').toLowerCase()} · Shift+Enter ↵
                        </span>
                    </div>
                    <Tooltip content={t('chat.send')} side="top">
                        <Button
                            variant="primary"
                            size="icon"
                            className="chat-section__send-btn"
                            onClick={() => void sendMessage(input)}
                            disabled={loading || input.trim() === ''}
                            aria-label={t('chat.send')}
                            leftIcon={<SendHorizontal size={18} />}
                        />
                    </Tooltip>
                </div>
            )}
        </div>
    );
}
