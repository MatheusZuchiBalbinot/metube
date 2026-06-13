import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui';
import { cn } from '@utils';
import './form.css';

interface CommentFormProps {
    initialValue?: string
    placeholder?: string
    submitLabel?: string
    isLoading?: boolean
    collapsible?: boolean
    onSubmit: (content: string) => Promise<void>
    onCancel?: () => void
}

const CHAR_LIMIT = 2000;
const CHAR_WARN_THRESHOLD = 1800;

export default function CommentForm({
    initialValue = '',
    placeholder,
    submitLabel,
    isLoading = false,
    collapsible = false,
    onSubmit,
    onCancel,
}: CommentFormProps) {
    const { t } = useTranslation();
    const [content, setContent] = useState(initialValue);
    const [expanded, setExpanded] = useState(!collapsible || initialValue !== '');

    const isBlank = content.trim() === '';
    const charCount = content.length;
    const isNearLimit = charCount > CHAR_WARN_THRESHOLD;

    const charCountClass = cn('comment-form__char-count', isNearLimit && 'comment-form__char-count--warn');

    function handleFormBlur(e: React.FocusEvent<HTMLFormElement>) {
        const focusMovedInside = e.currentTarget.contains(e.relatedTarget);

        if (!focusMovedInside && collapsible && isBlank) {
            setExpanded(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const isInvalid = isBlank || isLoading;

        if (isInvalid) {
            return;
        }

        await onSubmit(content.trim());
        setContent('');

        if (collapsible) {
            setExpanded(false);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        const isCtrlEnter = (e.ctrlKey || e.metaKey) && e.key === 'Enter';

        if (isCtrlEnter) {
            void handleSubmit(e);
        }
    }

    const formClass = cn('comment-form', expanded && 'comment-form--expanded');

    return (
        // onBlur collapses the form when focus leaves it — a focus event that is inherently keyboard-accessible.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <form
            className={formClass}
            onSubmit={(e) => {
                void handleSubmit(e);
            }}
            onBlur={handleFormBlur}
        >
            <textarea
                className="comment-form__textarea"
                value={content}
                onChange={e => setContent(e.target.value)}
                onFocus={() => setExpanded(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder ?? t('comments.placeholder')}
                rows={expanded ? 3 : 1}
                maxLength={CHAR_LIMIT}
                disabled={isLoading}
            />
            {expanded && (
                <div className="comment-form__actions">
                    <div className="comment-form__meta">
                        <span className={charCountClass}>{charCount}/{CHAR_LIMIT}</span>
                        <span className="comment-form__hint">{t('comments.submit_hint')}</span>
                    </div>
                    <div className="comment-form__buttons">
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
                </div>
            )}
        </form>
    );
}
