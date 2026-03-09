import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import Button from '../button/button';
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

// eslint-disable-next-line complexity
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

    function handleSelect(optValue: string) {
        onChange(optValue);
        setOpen(false);
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
                >
                    <span className={selected ? 'dropdown-value' : 'dropdown-value dropdown-value--placeholder'}>
                        {selected ? (
                            <span className="dropdown-value-inner">
                                {selected.icon && (
                                    <span className="dropdown-value-icon">{selected.icon}</span>
                                )}
                                {selected.label}
                            </span>
                        ) : (
                            placeholder
                        )}
                    </span>
                    <ChevronDown
                        size={15}
                        className={`dropdown-chevron${open ? ' dropdown-chevron--open' : ''}`}
                    />
                </Button>

                {open && (
                    <div className="dropdown-menu" role="listbox">
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
