import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, SendHorizontal, X } from 'lucide-react';
import type { VideoSummary, VideoTranscription, Vuid } from '@api';
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
    summary: VideoSummary | null
}

interface ChatEntry {
    role: 'user' | 'assistant'
    content: string
}

const QUICK_QUESTIONS = ['chat.quick_q1', 'chat.quick_q2', 'chat.quick_q3'] as const;

// Streams `fullText` word-by-word, targeting at most 2.5 seconds total.
function computeStreamInterval(wordCount: number): number {
    const TARGET_MS = 2500;
    return Math.max(12, Math.min(60, TARGET_MS / wordCount));
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

interface AiBubbleProps {
    content: string
    isStreaming?: boolean
}

function AiBubble({ content, isStreaming = false }: AiBubbleProps) {
    return (
        <div className="chat-section__bubble chat-section__bubble--ai">
            <span className="chat-section__ai-badge" aria-hidden="true">
                <Sparkles size={11} />
            </span>
            <p className={`chat-section__bubble-text${isStreaming ? ' chat-section__bubble-text--streaming' : ''}`}>
                {content}
            </p>
        </div>
    );
}

// eslint-disable-next-line complexity
export default function ChatSection({ vuid, transcription, summary: _summary }: ChatSectionProps) {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [messages, setMessages] = useState<ChatEntry[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isTranscriptionReady = transcription !== null && domain.transcription.isCompleted(transcription);
    const hasMessages = messages.length > 0;
    const isBusy = loading || isStreaming;

    useEffect(() => {
        const el = listRef.current;
        if (!el) {
            return;
        }
        el.scrollTop = el.scrollHeight;
    }, [messages, loading, streamingText]);

    useEffect(() => {
        return () => {
            if (streamTimerRef.current !== null) {
                clearInterval(streamTimerRef.current);
            }
        };
    }, []);

    function growTextarea() {
        const el = textareaRef.current;
        if (!el) {
            return;
        }
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }

    const streamResponse = useCallback((fullText: string) => {
        const words = fullText.split(' ');
        const intervalMs = computeStreamInterval(words.length);
        let idx = 0;

        setStreamingText('');
        setIsStreaming(true);

        streamTimerRef.current = setInterval(() => {
            idx += 1;
            setStreamingText(words.slice(0, idx).join(' '));

            const isDone = idx >= words.length;
            if (isDone) {
                clearInterval(streamTimerRef.current!);
                streamTimerRef.current = null;
                setIsStreaming(false);
                setStreamingText('');
                setMessages(prev => [...prev, { role: 'assistant', content: fullText }]);
            }
        }, intervalMs);
    }, []);

    const sendMessage = useCallback(async (question: string) => {
        const trimmed = question.trim();

        if (trimmed === '' || isBusy) {
            return;
        }

        setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
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

        streamResponse(result.data.answer);
    }, [isBusy, messages, vuid, dispatch, t, streamResponse]);

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
        if (streamTimerRef.current !== null) {
            clearInterval(streamTimerRef.current);
            streamTimerRef.current = null;
        }
        setIsStreaming(false);
        setStreamingText('');
        setMessages([]);
    }

    return (
        <div className="chat-section">
            {/* Header */}
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

            {/* Message area */}
            <div className="chat-section__list" ref={listRef}>
                {!hasMessages && !isBusy && (
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

                {messages.map((msg, i) => (
                    msg.role === 'user'
                        ? <UserBubble key={i} content={msg.content} />
                        : <AiBubble key={i} content={msg.content} />
                ))}

                {loading && <TypingIndicator />}
                {isStreaming && streamingText !== '' && (
                    <AiBubble content={streamingText} isStreaming />
                )}
            </div>

            {/* Input row — only when transcription is ready */}
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
                            disabled={isBusy}
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
                            disabled={isBusy || input.trim() === ''}
                            aria-label={t('chat.send')}
                            leftIcon={<SendHorizontal size={18} />}
                        />
                    </Tooltip>
                </div>
            )}
        </div>
    );
}
