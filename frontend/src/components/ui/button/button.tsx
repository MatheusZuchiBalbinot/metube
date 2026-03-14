import { useRef, type ButtonHTMLAttributes } from 'react';
import './button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant
    size?: ButtonSize
    loading?: boolean
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
    fullWidth?: boolean
}

function buildButtonClass(variant: ButtonVariant, size: ButtonSize, fullWidth: boolean, className: string) {
    return ['btn', `btn--${variant}`, `btn--${size}`, fullWidth ? 'btn--full' : '', className]
        .filter(Boolean)
        .join(' ');
}

export default function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    children,
    className = '',
    disabled,
    onClick,
    ...props
}: ButtonProps) {
    const classes = buildButtonClass(variant, size, fullWidth, className);
    const btnRef = useRef<HTMLButtonElement>(null);

    function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
        const btn = btnRef.current;
        if (btn) {
            const rect = btn.getBoundingClientRect();
            const ripple = document.createElement('span');
            const size = Math.max(rect.width, rect.height) * 2;
            ripple.className = 'btn__ripple';
            ripple.style.width = `${size}px`;
            ripple.style.height = `${size}px`;
            ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
            ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
            btn.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove());
        }
        onClick?.(e);
    }

    return (
        <button ref={btnRef} className={classes} disabled={disabled || loading} onClick={handleClick} {...props}>
            {loading ? (
                <span className="btn__spinner" />
            ) : (
                <>
                    {leftIcon}
                    {children}
                    {rightIcon}
                </>
            )}
        </button>
    );
}
