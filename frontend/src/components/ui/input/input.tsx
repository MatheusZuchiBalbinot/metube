import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import Tooltip from '../tooltip/tooltip';
import './input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    icon?: React.ReactNode
    error?: string
    helper?: string
}

function buildInputClass(icon: React.ReactNode, error: string | undefined, isPassword: boolean, className: string) {
    return [
        'input-field',
        icon ? 'input-field--icon' : '',
        isPassword ? 'input-field--password' : '',
        error ? 'input-field--error' : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');
}

function buildInputAria(id: string | undefined, error: string | undefined) {
    return {
        invalid: error ? true : undefined,
        describedBy: error ? `${id}-error` : undefined,
    };
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input({
    label,
    icon,
    error,
    helper,
    id,
    className = '',
    type,
    ...props
}, ref) {
    const { t } = useTranslation();
    const [passwordVisible, setPasswordVisible] = useState(false);
    const isPassword = type === 'password';
    const inputClass = buildInputClass(icon, error, isPassword, className);
    const aria = buildInputAria(id, error);
    const resolvedType = isPassword && passwordVisible ? 'text' : type;

    function handleTogglePasswordVisibility() {
        setPasswordVisible((prev) => !prev);
    }

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
                    type={resolvedType}
                    className={inputClass}
                    aria-invalid={aria.invalid}
                    aria-describedby={aria.describedBy}
                    {...props}
                />
                {isPassword && (
                    <Tooltip content={t(passwordVisible ? 'common.hide_password' : 'common.show_password')} side="top">
                        <button
                            type="button"
                            className="input-password-toggle"
                            onClick={handleTogglePasswordVisibility}
                            aria-label={t(passwordVisible ? 'common.hide_password' : 'common.show_password')}
                            aria-pressed={passwordVisible}
                        >
                            {passwordVisible ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
                        </button>
                    </Tooltip>
                )}
            </div>

            {error && <p id={`${id}-error`} className="input-error-msg" role="alert">{error}</p>}
            {!error && helper && <p className="input-helper-msg">{helper}</p>}
        </div>
    );
});

export default Input;
