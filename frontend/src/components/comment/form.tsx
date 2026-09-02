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

interface CommentFormActionsProps {
    charCount: number
    hint: string
    onCancel?: () => void
    cancelLabel: string
    isBlank: boolean
    isLoading: boolean
    loadingLabel: string
    submitLabel: string
}

function CommentFormActions({
    charCount,
    hint,
    onCancel,
    cancelLabel,
    isBlank,
    isLoading,
    loadingLabel,
    submitLabel,
}: CommentFormActionsProps) {
    const isNearLimit = charCount > CHAR_WARN_THRESHOLD;
    const charCountClass = cn('comment-form__char-count', isNearLimit && 'comment-form__char-count--warn');

    return (
        <div className="comment-form__actions">
            <div className="comment-form__meta">
                <span className={charCountClass}>{charCount}/{CHAR_LIMIT}</span>
                <span className="comment-form__hint">{hint}</span>
            </div>
            <div className="comment-form__buttons">
                {onCancel && (
                    <Button variant="ghost" size="sm" type="button" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                )}
                <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={isBlank || isLoading}
                >
                    {isLoading ? loadingLabel : submitLabel}
                </Button>
            </div>
        </div>
    );
}

interface CommentFormTextareaProps {
    content: string
    expanded: boolean
    isLoading: boolean
    placeholder?: string
    defaultPlaceholder: string
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
    onFocus: () => void
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

function CommentFormTextarea({
    content,
    expanded,
    isLoading,
    placeholder,
    defaultPlaceholder,
    onChange,
    onFocus,
    onKeyDown,
}: CommentFormTextareaProps) {
    return (
        <textarea
            className="comment-form__textarea"
            value={content}
            onChange={onChange}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
            placeholder={placeholder ?? defaultPlaceholder}
            rows={expanded ? 3 : 1}
            maxLength={CHAR_LIMIT}
            disabled={isLoading}
        />
    );
}

function shouldCollapseOnBlur(focusMovedInside: boolean, collapsible: boolean, isBlank: boolean): boolean {
    return !focusMovedInside && collapsible && isBlank;
}

function isSubmitBlocked(isBlank: boolean, isLoading: boolean): boolean {
    return isBlank || isLoading;
}

function isSubmitShortcut(e: React.KeyboardEvent<HTMLTextAreaElement>): boolean {
    return (e.ctrlKey || e.metaKey) && e.key === 'Enter';
}

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

    function handleFormBlur(e: React.FocusEvent<HTMLFormElement>) {
        const focusMovedInside = e.currentTarget.contains(e.relatedTarget);

        if (shouldCollapseOnBlur(focusMovedInside, collapsible, isBlank)) {
            setExpanded(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (isSubmitBlocked(isBlank, isLoading)) {
            return;
        }

        await onSubmit(content.trim());
        setContent('');

        if (collapsible) {
            setExpanded(false);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (isSubmitShortcut(e)) {
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
            <CommentFormTextarea
                content={content}
                expanded={expanded}
                isLoading={isLoading}
                placeholder={placeholder}
                defaultPlaceholder={t('comments.placeholder')}
                onChange={e => setContent(e.target.value)}
                onFocus={() => setExpanded(true)}
                onKeyDown={handleKeyDown}
            />
            {expanded && (
                <CommentFormActions
                    charCount={charCount}
                    hint={t('comments.submit_hint')}
                    onCancel={onCancel}
                    cancelLabel={t('common.cancel')}
                    isBlank={isBlank}
                    isLoading={isLoading}
                    loadingLabel={t('common.loading')}
                    submitLabel={submitLabel ?? t('comments.submit')}
                />
            )}
        </form>
    );
}
