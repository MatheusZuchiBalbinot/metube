import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { video as videoApi, type Vuid, type AiSuggestion } from '@api/videos';
import { useAppDispatch } from '@store/index';
import { videoActions } from '@store/videoSlice';
import { toastActions } from '@store/toastSlice';
import Button from '@ui/button/button';
import { ToastType } from '@enums/toastType';
import type { Video } from '@models/video';
import { domain } from '@domain';
import './aiSuggestions.css';
import { useVideo } from '@hooks';

interface Props {
    video: Video
}

export default function AiSuggestions({ video }: Props) {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { updateVideo } = useVideo();
    const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
    const [loading, setLoading] = useState(true);
    const [accepted, setAccepted] = useState(false);

    useEffect(() => {
        async function fetchSuggestion() {
            setLoading(true);
            const result = await videoApi.getAiSuggestion(video.id as Vuid);
            setSuggestion(result);
            setLoading(false);
        }

        void fetchSuggestion();
    }, [video.id]);

    const hasSuggestion = suggestion !== null && domain.aiSuggestion.isPending(suggestion);

    if (loading || !hasSuggestion || accepted) {
        return null;
    }

    async function handleAccept() {
        try {
            await videoApi.acceptAiSuggestion(video.id as Vuid);
            const updated = await videoApi.get(video.id as Vuid);

            if (updated) {
                dispatch(videoActions.updateVideo(updated));
                updateVideo(updated);
            }

            dispatch(toastActions.addToast({
                message: t('ai_suggestion.accepted_toast'),
                type: ToastType.SUCCESS,
            }));
            setAccepted(true);
        } catch {
            dispatch(toastActions.addToast({
                message: t('ai_suggestion.accept_error'),
                type: ToastType.ERROR,
            }));
        }
    }

    async function handleDismiss() {
        try {
            await videoApi.dismissAiSuggestion(video.id as Vuid);
            dispatch(toastActions.addToast({
                message: t('ai_suggestion.dismissed_toast'),
                type: ToastType.INFO,
            }));
            setSuggestion(null);
        } catch {
            dispatch(toastActions.addToast({
                message: t('ai_suggestion.dismiss_error'),
                type: ToastType.ERROR,
            }));
        }
    }

    return (
        <div className="ai-suggestions">
            <div className="ai-suggestions__header">
                <h3 className="ai-suggestions__title">{t('ai_suggestion.title')}</h3>
            </div>

            <div className="ai-suggestions__content">
                <div className="ai-suggestions__field">
                    <label className="ai-suggestions__label">{t('video.title')}</label>
                    <input
                        type="text"
                        className="ai-suggestions__input"
                        value={suggestion.suggestedTitle}
                        readOnly
                    />
                </div>

                <div className="ai-suggestions__field">
                    <label className="ai-suggestions__label">{t('video.description')}</label>
                    <textarea
                        className="ai-suggestions__textarea"
                        value={suggestion.suggestedDescription}
                        readOnly
                    />
                </div>

                <div className="ai-suggestions__field">
                    <label className="ai-suggestions__label">{t('video.tags')}</label>
                    <div className="ai-suggestions__tags">
                        {suggestion.suggestedTags.map(tag => (
                            <span key={tag} className="ai-suggestions__tag">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="ai-suggestions__actions">
                <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAccept}
                    className="ai-suggestions__accept-btn"
                >
                    <Check size={16} />
                    {t('ai_suggestion.accept')}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="ai-suggestions__dismiss-btn"
                >
                    <X size={16} />
                    {t('ai_suggestion.dismiss')}
                </Button>
            </div>
        </div>
    );
}
