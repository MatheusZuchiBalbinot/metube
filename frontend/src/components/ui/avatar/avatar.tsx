import './avatar.css';

export type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
    name: string
    size?: AvatarSize
    src?: string
    className?: string
}

export default function Avatar({ name, size = 'md', src, className = '' }: AvatarProps) {
    const initial = name.charAt(0).toUpperCase();

    const classes = [
        'avatar',
        'avatar-grad',
        `avatar--${size}`,
        size === 'sm' ? 'avatar-nav-ring' : '',
        size === 'lg' ? 'avatar-glow' : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={classes} role="img" aria-label={name}>
            {src ? (
                <img src={src} alt={name} />
            ) : (
                initial
            )}
        </div>
    );
}
