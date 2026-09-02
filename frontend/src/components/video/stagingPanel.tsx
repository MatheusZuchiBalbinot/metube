import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeOff, Sparkles, Check, X } from '@components/icons/icons';
import { useAppDispatch } from '@store';
import { videoActions } from '@store/videoSlice';
import { toastActions } from '@store/toastSlice';
import { ToastType } from '@enums/toastType';
import { video as videoApi, toVuid } from '@api';
import type { AiSuggestion, VideoSummary } from '@api';
import { Button, Input, Modal } from '@ui';
import { VideoStatus } from '@models';
import type { Video } from '@models';
import type { Tag } from '@models';
import { domain } from '@domain';
import { getEcho } from '@lib/echo';
import { useAuth } from '@hooks';
import TagInput from '@components/tag/input';
import './stagingPanel.css';

interface StagingPanelProps {
    video: Video
    summary: VideoSummary | null
}

function resolveStagingFlags(suggestion: AiSuggestion | null, summary: VideoSummary | null) {
    const hasPendingSuggestion = suggestion !== null && domain.aiSuggestion.isPending(suggestion);
    const hasKeyPoints = summary !== null && summary.keyPoints.length > 0;

    return { hasPendingSuggestion, hasKeyPoints };
}

interface AiSuggestionIndicatorProps {
    aiLoading: boolean
    hasPendingSuggestion: boolean
    onOpenModal: () => void
    aiAnalyzingLabel: string
    suggestionLabel: string
}

function AiSuggestionIndicator({ aiLoading, hasPendingSuggestion, onOpenModal, aiAnalyzingLabel, suggestionLabel }: AiSuggestionIndicatorProps) {
    if (aiLoading) {
        return <span className="staging-panel__ai-pulse" aria-label={aiAnalyzingLabel} />;
    }

    if (!hasPendingSuggestion) {
        return null;
    }

    return (
        <span className="ai-border">
            <Button variant="ghost" size="sm" className="ai-border__btn" leftIcon={<Sparkles size={14} />} onClick={onOpenModal}>
                {suggestionLabel}
            </Button>
        </span>
    );
}

export default function StagingPanel({ video, summary }: StagingPanelProps) {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { user } = useAuth();

    const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
    const [aiLoading, setAiLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [applying, setApplying] = useState(false);

    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editTags, setEditTags] = useState<Tag[]>([]);

    async function fetchSuggestion() {
        setAiLoading(true);
        const result = await videoApi.getAiSuggestion(toVuid(video.id));
        setSuggestion(result.ok ? result.data : null);
        setAiLoading(false);
    }

    useEffect(() => {
        // fetchSuggestion flips the loading flag on mount; intended initial state, not a cascade.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchSuggestion();
    }, [video.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const isUserReady = user !== null;

        if (!isUserReady) {
            return;
        }

        let isCancelled = false;

        void getEcho().then(echo => {
            if (isCancelled || echo === null) {
                return;
            }

            echo.private(`users.${user.uuid}`).listen('.AiSuggestionReady', (payload: { vuid: string }) => {
                const isForThisVideo = payload.vuid === video.id;

                if (isForThisVideo) {
                    void fetchSuggestion();
                }
            });
        });

        return () => {
            isCancelled = true;
            void getEcho().then(echo => {
                echo?.private(`users.${user.uuid}`).stopListening('.AiSuggestionReady');
            });
        };
    }, [user, video.id]); // eslint-disable-line react-hooks/exhaustive-deps

    function openModal() {
        if (suggestion !== null) {
            setEditTitle(suggestion.suggestedTitle);
            setEditDescription(suggestion.suggestedDescription);
            setEditTags(suggestion.suggestedTags as Tag[]);
        }

        setModalOpen(true);
    }

    const handlePublish = useCallback(async (): Promise<void> => {
        setPublishing(true);

        const result = await videoApi.publish(toVuid(video.id));

        setPublishing(false);

        if (!result.ok) {
            dispatch(toastActions.addToast({ message: result.error, type: ToastType.ERROR }));
            return;
        }

        dispatch(videoActions.updateVideoStatus({ vuid: toVuid(video.id), status: VideoStatus.PUBLISHED }));
        dispatch(toastActions.addToast({ message: t('video.staging.published_toast'), type: ToastType.SUCCESS }));
    }, [video.id, dispatch, t]);

    async function handleApply() {
        setApplying(true);

        const updateResult = await videoApi.update(toVuid(video.id), {
            title: editTitle.trim() || undefined,
            description: editDescription.trim() || undefined,
            tags: editTags,
        });

        if (!updateResult.ok) {
            dispatch(toastActions.addToast({ message: updateResult.error, type: ToastType.ERROR }));
            setApplying(false);
            return;
        }

        try {
            await videoApi.acceptAiSuggestion(toVuid(video.id));
        } catch {
            // non-critical — the video was already updated
        }

        dispatch(videoActions.upsertVideo(updateResult.data));
        dispatch(toastActions.addToast({ message: t('ai_suggestion.accepted_toast'), type: ToastType.SUCCESS }));
        setSuggestion(null);
        setModalOpen(false);
        setApplying(false);
    }

    async function handleDismiss() {
        try {
            await videoApi.dismissAiSuggestion(toVuid(video.id));
        } catch {
            // best-effort
        }

        dispatch(toastActions.addToast({ message: t('ai_suggestion.dismissed_toast'), type: ToastType.INFO }));
        setSuggestion(null);
        setModalOpen(false);
    }

    const { hasPendingSuggestion, hasKeyPoints } = resolveStagingFlags(suggestion, summary);

    return (
        <>
            <div className="staging-panel" role="status">
                <div className="staging-panel__badge">
                    <EyeOff size={15} aria-hidden="true" />
                    <span className="staging-panel__label">{t('video.staging.draft_label')}</span>
                </div>

                <div className="staging-panel__actions">
                    <AiSuggestionIndicator
                        aiLoading={aiLoading}
                        hasPendingSuggestion={hasPendingSuggestion}
                        onOpenModal={openModal}
                        aiAnalyzingLabel={t('video.staging.ai_analyzing')}
                        suggestionLabel={t('ai_suggestion.title')}
                    />

                    <Button
                        variant="primary"
                        size="sm"
                        disabled={publishing}
                        onClick={() => void handlePublish()}
                    >
                        {publishing ? t('video.staging.publishing') : t('video.staging.publish_btn')}
                    </Button>
                </div>
            </div>

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={t('ai_suggestion.title')}
                size="md"
                footer={
                    <div className="staging-modal__footer">
                        <Button variant="ghost" size="sm" leftIcon={<X size={14} />} onClick={() => void handleDismiss()}>
                            {t('ai_suggestion.dismiss')}
                        </Button>
                        <Button variant="primary" size="sm" leftIcon={<Check size={14} />} disabled={applying} onClick={() => void handleApply()}>
                            {applying ? t('common.loading') : t('ai_suggestion.accept')}
                        </Button>
                    </div>
                }
            >
                <div className="staging-modal__ai-bar" aria-hidden="true" />
                <div className="staging-modal__body">
                    <Input
                        label={t('video.title')}
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                    />

                    <div className="staging-modal__field">
                        <label className="staging-modal__label">{t('video.description')}</label>
                        <textarea
                            className="staging-modal__textarea"
                            value={editDescription}
                            onChange={e => setEditDescription(e.target.value)}
                            rows={4}
                        />
                    </div>

                    <div className="staging-modal__field">
                        <label className="staging-modal__label">{t('video.tags')}</label>
                        <TagInput value={editTags} onChange={setEditTags} />
                    </div>

                    {hasKeyPoints && (
                        <div className="staging-modal__field">
                            <span className="staging-modal__label">{t('video.key_points')}</span>
                            <ul className="staging-modal__key-points">
                                {summary!.keyPoints.map((point, i) => (
                                    <li key={i} className="staging-modal__key-point">{point}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
}
