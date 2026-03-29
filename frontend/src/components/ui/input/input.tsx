import { forwardRef, type InputHTMLAttributes } from 'react';
import './input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    icon?: React.ReactNode
    error?: string
    helper?: string
}

function buildInputClass(icon: React.ReactNode, error: string | undefined, className: string) {
    return ['input-field', icon ? 'input-field--icon' : '', error ? 'input-field--error' : '', className]
        .filter(Boolean)
        .join(' ');
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input({
    label,
    icon,
    error,
    helper,
    id,
    className = '',
    ...props
}, ref) {
    const inputClass = buildInputClass(icon, error, className);

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
                <input
                    ref={ref}
                    id={id}
                    className={inputClass}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-error` : undefined}
                    {...props}
                />
            </div>

            {error && <p id={`${id}-error`} className="input-error-msg" role="alert">{error}</p>}
            {!error && helper && <p className="input-helper-msg">{helper}</p>}
        </div>
    );
});

export default Input;
