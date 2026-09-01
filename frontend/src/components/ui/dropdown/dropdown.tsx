import { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from '@components/icons/icons';
import Button from '../button/button';
import { useMediaQuery } from '@hooks';
import { cn } from '@utils';
import './dropdown.css';
import { t } from 'i18next';

export interface DropdownOption {
    label: string
    value: string
    icon?: React.ReactNode
}

interface DropdownProps {
    options: DropdownOption[]
    value?: string
    onChange: (value: string) => void
    placeholder?: string
    label?: string
    disabled?: boolean
}

function buildTriggerClass(open: boolean, disabled: boolean) {
    return ['dropdown-trigger', open ? 'dropdown-trigger--open' : '', disabled ? 'dropdown-trigger--disabled' : '']
        .filter(Boolean)
        .join(' ');
}

interface DropdownOptionItemProps {
    opt: DropdownOption
    selected: boolean
    onSelect: (value: string) => void
}

function DropdownOptionItem({ opt, selected, onSelect }: DropdownOptionItemProps) {
    return (
        <Button
            type="button"
            role="option"
            variant="ghost"
            onClick={() => onSelect(opt.value)}
            className={`dropdown-option${selected ? ' dropdown-option--active' : ''}`}
            aria-selected={selected}
            aria-label={opt.label}
        >
            {opt.icon && <span className="dropdown-option-icon">{opt.icon}</span>}
            <span className="dropdown-option-label">{opt.label}</span>
            {selected && <Check size={13} className="dropdown-option-check" />}
        </Button>
    );
}

interface DropdownTriggerValueProps {
    selected: DropdownOption | undefined
    placeholder: string
}

// Isolated so the selected-vs-placeholder branching doesn't count against Dropdown's own complexity.
function DropdownTriggerValue({ selected, placeholder }: DropdownTriggerValueProps) {
    if (!selected) {
        return <>{placeholder}</>;
    }

    return (
        <span className="dropdown-value-inner">
            {selected.icon && <span className="dropdown-value-icon">{selected.icon}</span>}
            {selected.label}
        </span>
    );
}

export default function Dropdown({
    options,
    value,
    onChange,
    placeholder = t('dropdown.select-placeholder'),
    label,
    disabled = false,
}: DropdownProps) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuId = useId();
    const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

    // Stay mounted a beat past open=false so drop-out can play — otherwise the
    // menu that animates in on open just vanishes on close (see Modal for the
    // same pattern, used there for the same reason).
    const [shouldRenderMenu, setShouldRenderMenu] = useState(false);
    const [isMenuClosing, setIsMenuClosing] = useState(false);

    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local mount/animation state to the open flag is the point of this effect
            setShouldRenderMenu(true);
            setIsMenuClosing(false);
            return;
        }

        if (!shouldRenderMenu) {
            return;
        }

        if (prefersReducedMotion) {
            setShouldRenderMenu(false);
            return;
        }

        setIsMenuClosing(true);
        // shouldRenderMenu is only read to decide whether a close needs animating — it's set
        // by this same effect and by the animationend handler, so it must stay out of the
        // deps below or every state flip it causes would immediately re-run this effect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, prefersReducedMotion]);

    function handleMenuAnimationEnd(e: React.AnimationEvent) {
        const isOwnAnimation = e.target === e.currentTarget;

        if (isMenuClosing && isOwnAnimation) {
            setShouldRenderMenu(false);
            setIsMenuClosing(false);
        }
    }

    const selected = options.find((o) => o.value === value);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Moves focus into the menu on open regardless of how it was opened (click or
    // keyboard) — without this, the menu's own onKeyDown (arrow-nav/Escape) never
    // fires, since focus stays on the trigger and keyboard events never reach it.
    useEffect(() => {
        const isMenuNotReady = !open || !shouldRenderMenu;
        if (isMenuNotReady) {
            return;
        }

        const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
        const isNoItems = !items || items.length === 0;
        if (isNoItems) {
            return;
        }

        const selectedIndex = options.findIndex((o) => o.value === value);
        const target = selectedIndex >= 0 ? items[selectedIndex] : items[0];
        target?.focus();
    }, [open, shouldRenderMenu, options, value]);

    function handleSelect(optValue: string) {
        onChange(optValue);
        setOpen(false);
    }

    function closeMenuAndReturnFocus() {
        setOpen(false);
        wrapRef.current?.querySelector<HTMLElement>('.dropdown-trigger')?.focus();
    }

    function focusMenuOptionAt(items: HTMLElement[], nextIndex: number) {
        const wrappedIndex = (nextIndex + items.length) % items.length;
        items[wrappedIndex]?.focus();
    }

    // Resolves the target index for every roving-focus key except Escape (handled
    // separately since it closes the menu instead of moving focus within it).
    function resolveMenuFocusIndex(key: string, items: HTMLElement[]): number | null {
        if (key === 'Home') {
            return 0;
        }

        if (key === 'End') {
            return items.length - 1;
        }

        const currentIndex = items.indexOf(document.activeElement as HTMLElement);

        if (key === 'ArrowDown') {
            return currentIndex + 1;
        }

        if (key === 'ArrowUp') {
            return currentIndex - 1;
        }

        return null;
    }

    function handleMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeMenuAndReturnFocus();
            return;
        }

        const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
        const isNoItems = items.length === 0;

        if (isNoItems) {
            return;
        }

        const targetIndex = resolveMenuFocusIndex(e.key, items);

        if (targetIndex === null) {
            return;
        }

        e.preventDefault();
        focusMenuOptionAt(items, targetIndex);
    }

    const triggerClass = buildTriggerClass(open, disabled);

    return (
        <div className="dropdown-wrap">
            {label && <span className="dropdown-label">{label}</span>}

            <div className="dropdown-trigger-wrap" ref={wrapRef}>
                <Button
                    type="button"
                    variant="ghost"
                    className={triggerClass}
                    onClick={() => !disabled && setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-haspopup="listbox"
                    aria-controls={menuId}
                >
                    <span className={selected ? 'dropdown-value' : 'dropdown-value dropdown-value--placeholder'}>
                        <DropdownTriggerValue selected={selected} placeholder={placeholder} />
                    </span>
                    <ChevronDown
                        size={15}
                        className={`dropdown-chevron${open ? ' dropdown-chevron--open' : ''}`}
                    />
                </Button>

                {shouldRenderMenu && (
                    <div
                        id={menuId}
                        ref={menuRef}
                        className={cn('dropdown-menu', isMenuClosing && 'dropdown-menu--closing')}
                        role="listbox"
                        onAnimationEnd={handleMenuAnimationEnd}
                        onKeyDown={handleMenuKeyDown}
                    >
                        {options.map((opt) => (
                            <DropdownOptionItem
                                key={opt.value}
                                opt={opt}
                                selected={opt.value === value}
                                onSelect={handleSelect}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
