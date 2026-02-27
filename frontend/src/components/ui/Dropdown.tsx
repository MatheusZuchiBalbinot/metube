import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import './dropdown.css'

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

export default function Dropdown({
    options,
    value,
    onChange,
    placeholder = 'Selecionar...',
    label,
    disabled = false,
}: DropdownProps) {
    const [open, setOpen] = useState(false)
    const wrapRef = useRef<HTMLDivElement>(null)

    const selected = options.find((o) => o.value === value)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    function handleSelect(optValue: string) {
        onChange(optValue)
        setOpen(false)
    }

    const triggerClass = [
        'dropdown-trigger',
        open ? 'dropdown-trigger--open' : '',
        disabled ? 'dropdown-trigger--disabled' : '',
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <div className="dropdown-wrap">
            {label && (
                <span className="dropdown-label">{label}</span>
            )}

            <div className="dropdown-trigger-wrap" ref={wrapRef}>
                <button
                    type="button"
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
                </button>

                {open && (
                    <div className="dropdown-menu">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleSelect(opt.value)}
                                className={`dropdown-option${opt.value === value ? ' dropdown-option--active' : ''}`}
                            >
                                {opt.icon && (
                                    <span className="dropdown-option-icon">{opt.icon}</span>
                                )}
                                <span className="dropdown-option-label">{opt.label}</span>
                                {opt.value === value && (
                                    <Check size={13} className="dropdown-option-check" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
