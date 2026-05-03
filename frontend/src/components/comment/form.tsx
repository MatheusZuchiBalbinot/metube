import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui';
import './form.css';

interface CommentFormProps {
    initialValue?: string
    placeholder?: string
    submitLabel?: string
    isLoading?: boolean
    onSubmit: (content: string) => Promise<void>
    onCancel?: () => void
}

export default function CommentForm({
    initialValue = '',
    placeholder,
    submitLabel,
    isLoading = false,
    onSubmit,
    onCancel,
}: CommentFormProps) {
    const { t } = useTranslation();
    const [content, setContent] = useState(initialValue);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const isBlank = content.trim() === '';

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const isInvalid = isBlank || isLoading;

        if (isInvalid) {
            return;
        }

        await onSubmit(content.trim());
        setContent('');
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        const isCtrlEnter = (e.ctrlKey || e.metaKey) && e.key === 'Enter';

        if (isCtrlEnter) {
            void handleSubmit(e);
        }
    }

    return (
        <form className="comment-form" onSubmit={(e) => {
            void handleSubmit(e);
        }}>
            <textarea
                ref={textareaRef}
                className="comment-form__textarea"
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder ?? t('comments.placeholder')}
                rows={3}
                maxLength={2000}
                disabled={isLoading}
            />
            <div className="comment-form__actions">
                {onCancel && (
                    <Button variant="ghost" size="sm" type="button" onClick={onCancel}>
                        {t('common.cancel')}
                    </Button>
                )}
                <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={isBlank || isLoading}
                >
                    {isLoading ? t('common.loading') : (submitLabel ?? t('comments.submit'))}
                </Button>
            </div>
        </form>
    );
}
