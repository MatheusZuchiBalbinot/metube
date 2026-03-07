import { useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button, Tooltip } from '@ui';
import './input.css';

interface TagInputProps {
    value: string[]
    onChange: (tags: string[]) => void
    placeholder?: string
}

export default function TagInput({
    value,
    onChange,
    placeholder,
}: TagInputProps) {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const resolvedPlaceholder = placeholder ?? t('tag.add_placeholder');

    function addTag(raw: string) {
        const trimmed = raw.trim().toLowerCase();
        const isEmpty = trimmed === '';
        if (isEmpty) { return; }
        const isDuplicate = value.includes(trimmed);
        if (isDuplicate) { return; }
        onChange([...value, trimmed]);
    }

    function removeTag(tag: string) {
        onChange(value.filter(t => t !== tag));
    }

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        const input = e.currentTarget;

        const isEnter = e.key === 'Enter';
        const isComma = e.key === ',';

        if (isEnter || isComma) {
            e.preventDefault();
            addTag(input.value);
            input.value = '';
            return;
        }

        const isBackspace = e.key === 'Backspace';
        const isInputEmpty = input.value === '';
        const hasTags = value.length > 0;

        if (isBackspace && isInputEmpty && hasTags) {
            removeTag(value[value.length - 1]);
        }
    }

    function handleWrapClick() {
        inputRef.current?.focus();
    }

    return (
        <div className="tag-input" onClick={handleWrapClick}>
            <div className="tag-input__field-wrap">
                {value.map(tag => (
                    <span key={tag} className="tag-input__chip">
                        {tag}
                        <Tooltip content={t('tag.remove_tag', { tag })} side="top">
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="tag-input__chip-remove"
                                onClick={e => { e.stopPropagation(); removeTag(tag); }}
                                aria-label={t('tag.remove_tag', { tag })}
                            >
                                <X size={12} />
                            </Button>
                        </Tooltip>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    type="text"
                    className="tag-input__field"
                    placeholder={value.length === 0 ? resolvedPlaceholder : ''}
                    onKeyDown={handleKeyDown}
                    onBlur={e => {
                        const hasValue = e.target.value.trim() !== '';
                        if (!hasValue) { return; }
                        addTag(e.target.value);
                        e.target.value = '';
                    }}
                />
            </div>
        </div>
    );
}
