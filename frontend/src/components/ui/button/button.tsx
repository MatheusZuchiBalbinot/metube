import { type ButtonHTMLAttributes } from 'react';
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
    ...props
}: ButtonProps) {
    const classes = buildButtonClass(variant, size, fullWidth, className);

    return (
        <button className={classes} disabled={disabled || loading} {...props}>
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
