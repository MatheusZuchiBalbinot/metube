import './avatar.css';

export type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
    name: string
    size?: AvatarSize
    src?: string
    ring?: boolean
    glow?: boolean
    className?: string
}

export default function Avatar({ name, size = 'md', src, ring = false, glow = false, className = '' }: AvatarProps) {
    const initial = name.charAt(0).toUpperCase();

    const classes = [
        'avatar',
        'avatar-grad',
        `avatar--${size}`,
        ring ? 'avatar-nav-ring' : '',
        glow ? 'avatar-glow' : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={classes} role="img" aria-label={name}>
            {src ? (
                <img src={src} alt={name} loading="lazy" decoding="async" />
            ) : (
                initial
            )}
        </div>
    );
}
