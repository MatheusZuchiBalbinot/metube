import { type InputHTMLAttributes } from 'react'
import './input.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    icon?: React.ReactNode
    error?: string
    helper?: string
}

function buildInputClass(icon: React.ReactNode, error: string | undefined, className: string) {
    return ['input-field', icon ? 'input-field--icon' : '', error ? 'input-field--error' : '', className]
        .filter(Boolean)
        .join(' ')
}

export default function Input({
    label,
    icon,
    error,
    helper,
    id,
    className = '',
    ...props
}: InputProps) {
    const inputClass = buildInputClass(icon, error, className)

    return (
        <div className="input-field-wrap">
            {label && (
                <label htmlFor={id} className="input-label">
                    {label}
                </label>
            )}

            <div className="input-inner">
                {icon && (
                    <span aria-hidden="true" className="input-icon">
                        {icon}
                    </span>
                )}
                <input id={id} className={inputClass} {...props} />
            </div>

            {error && <p className="input-error-msg">{error}</p>}
            {!error && helper && <p className="input-helper-msg">{helper}</p>}
        </div>
    )
}
