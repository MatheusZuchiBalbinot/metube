import { useRef, useState, useMemo, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button, Tooltip } from '@ui';
import type { Tag } from '@models';
import './input.css';

const MAX_SUGGESTIONS = 6 as const;

interface TagInputProps {
    value: Tag[]
    onChange: (tags: Tag[]) => void
    placeholder?: string
    suggestions?: Tag[]
}

export default function TagInput({
    value,
    onChange,
    placeholder,
    suggestions,
}: TagInputProps) {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const resolvedPlaceholder = placeholder ?? t('tag.add_placeholder');

    const filteredSuggestions = useMemo(() => {
        const trimmed = query.trim().toLowerCase();
        const isQueryEmpty = trimmed === '';
        const hasSuggestions = suggestions !== undefined && suggestions.length > 0;

        if (isQueryEmpty || !hasSuggestions) {
            return [] as Tag[];
        }

        const selectedSet = new Set(value.map(tag => tag.toLowerCase()));

        return suggestions
            .filter(tag => {
                const normalized = tag.toLowerCase();
                const matches = normalized.includes(trimmed);
                const isAlreadySelected = selectedSet.has(normalized);
                return matches && !isAlreadySelected;
            })
            .slice(0, MAX_SUGGESTIONS);
    }, [suggestions, query, value]);

    const hasFilteredSuggestions = filteredSuggestions.length > 0;
    const shouldShowDropdown = isOpen && hasFilteredSuggestions;

    function addTag(raw: string) {
        const trimmed = raw.trim().toLowerCase() as Tag;
        const isEmpty = trimmed === '';
        if (isEmpty) {
            return;
        }
        const isDuplicate = value.includes(trimmed);
        if (isDuplicate) {
            return;
        }
        onChange([...value, trimmed]);
    }

    function removeTag(tag: Tag) {
        onChange(value.filter(t => t !== tag));
    }

    function commitInput(input: HTMLInputElement) {
        addTag(input.value);
        input.value = '';
        setQuery('');
        setIsOpen(false);
    }

    function selectSuggestion(tag: Tag) {
        addTag(tag);

        if (inputRef.current) {
            inputRef.current.value = '';
            inputRef.current.focus();
        }

        setQuery('');
        setIsOpen(false);
    }

    function focusFirstSuggestion() {
        const list = listRef.current;
        if (!list) {
            return;
        }
        const first = list.querySelector<HTMLLIElement>('li[role="option"]');
        first?.focus();
    }

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        const input = e.currentTarget;

        const isEnter = e.key === 'Enter';
        const isComma = e.key === ',';

        if (isEnter || isComma) {
            e.preventDefault();
            commitInput(input);
            return;
        }

        const isArrowDown = e.key === 'ArrowDown';

        if (isArrowDown && shouldShowDropdown) {
            e.preventDefault();
            focusFirstSuggestion();
            return;
        }

        const isEscape = e.key === 'Escape';

        if (isEscape && isOpen) {
            e.preventDefault();
            setIsOpen(false);
            return;
        }

        const isBackspace = e.key === 'Backspace';
        const isInputEmpty = input.value === '';
        const hasTags = value.length > 0;

        if (isBackspace && isInputEmpty && hasTags) {
            removeTag(value[value.length - 1]);
        }
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        setQuery(e.target.value);
        setIsOpen(true);
    }

    function handleInputBlur(e: React.FocusEvent<HTMLInputElement>) {
        const hasValue = e.target.value.trim() !== '';

        if (!hasValue) {
            return;
        }

        addTag(e.target.value);
        e.target.value = '';
        setQuery('');
    }

    function handleSuggestionKeyDown(e: KeyboardEvent<HTMLLIElement>, tag: Tag, index: number) {
        const isEnter = e.key === 'Enter';

        if (isEnter) {
            e.preventDefault();
            selectSuggestion(tag);
            return;
        }

        const isArrowDown = e.key === 'ArrowDown';

        if (isArrowDown) {
            e.preventDefault();
            const list = listRef.current;
            const next = list?.querySelectorAll<HTMLLIElement>('li[role="option"]')[index + 1];
            next?.focus();
            return;
        }

        const isArrowUp = e.key === 'ArrowUp';

        if (isArrowUp) {
            e.preventDefault();
            const list = listRef.current;
            const items = list?.querySelectorAll<HTMLLIElement>('li[role="option"]');
            const isFirst = index === 0;

            if (isFirst) {
                inputRef.current?.focus();
                return;
            }

            items?.[index - 1]?.focus();
            return;
        }

        const isEscape = e.key === 'Escape';

        if (isEscape) {
            e.preventDefault();
            setIsOpen(false);
            inputRef.current?.focus();
        }
    }

    function handleListMouseDown(e: React.MouseEvent) {
        e.preventDefault();
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
                                onClick={e => {
                                    e.stopPropagation();
                                    removeTag(tag);
                                }}
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
                    aria-label={t('tag.add_placeholder')}
                    placeholder={value.length === 0 ? resolvedPlaceholder : ''}
                    onKeyDown={handleKeyDown}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    aria-autocomplete="list"
                    aria-expanded={shouldShowDropdown}
                />
                {shouldShowDropdown && (
                    <ul
                        ref={listRef}
                        className="tag-input__suggestions"
                        role="listbox"
                        aria-label={t('tag.suggestions')}
                        onMouseDown={handleListMouseDown}
                    >
                        {filteredSuggestions.map((tag, index) => (
                            <li
                                key={tag}
                                role="option"
                                aria-selected={false}
                                tabIndex={-1}
                                className="tag-input__suggestion"
                                onClick={() => selectSuggestion(tag)}
                                onKeyDown={e => handleSuggestionKeyDown(e, tag, index)}
                            >
                                {tag}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
