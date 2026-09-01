import type { Size } from '../types';
import './avatar.css';

interface AvatarProps {
    name: string
    size?: Size
    src?: string
    ring?: boolean
    glow?: boolean
    className?: string
}

const AVATAR_PX: Record<Size, number> = { sm: 30, md: 40, lg: 56 };

function resizedSrc(src: string, size: Size): string {
    const isPravatar = src.includes('i.pravatar.cc/');

    if (!isPravatar) {
        return src;
    }

    const targetPx = AVATAR_PX[size] * 2;

    return src.replace(/i\.pravatar\.cc\/\d+/, `i.pravatar.cc/${targetPx}`);
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
                <img src={resizedSrc(src, size)} alt={name} loading="lazy" decoding="async" />
            ) : (
                initial
            )}
        </div>
    );
}
