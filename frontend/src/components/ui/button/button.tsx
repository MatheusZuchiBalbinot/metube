import { useRef, type ButtonHTMLAttributes } from 'react';
import type { Size } from '../types';
import './button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'overlay';
export type ButtonSize = Size | 'icon';

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

function spawnRipple(btn: HTMLButtonElement, e: React.MouseEvent<HTMLButtonElement>) {
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

function renderButtonContent(loading: boolean, leftIcon: React.ReactNode, children: React.ReactNode, rightIcon: React.ReactNode) {
    if (loading) {
        return <span className="btn__spinner" />;
    }

    return (
        <>
            {leftIcon !== undefined && <span className="btn__icon">{leftIcon}</span>}
            {children !== undefined && <span className="btn__label">{children}</span>}
            {rightIcon !== undefined && <span className="btn__icon">{rightIcon}</span>}
        </>
    );
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
            spawnRipple(btn, e);
        }
        onClick?.(e);
    }

    return (
        <button ref={btnRef} className={classes} disabled={disabled || loading} onClick={handleClick} {...props}>
            {renderButtonContent(loading, leftIcon, children, rightIcon)}
        </button>
    );
}
