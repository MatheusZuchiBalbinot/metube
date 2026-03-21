import { TagColors } from '@utils/tagColors';
import './badge.css';

interface TagBadgeProps {
    tag: string;
    prefix?: string;
    className?: string;
    title?: string;
    onClick?: (e: React.MouseEvent, tag: string) => void;
}

export default function TagBadge({ tag, prefix, className, title, onClick }: TagBadgeProps) {
    const palette = TagColors.palette(tag);
    const isClickable = onClick !== undefined;

    const cls = ['tag-badge', isClickable ? 'tag-badge--clickable' : '', className]
        .filter(Boolean)
        .join(' ');

    return (
        <span
            className={cls}
            style={{ background: palette.bg, color: palette.color }}
            role={isClickable ? 'button' : undefined}
            title={title}
            onClick={isClickable ? e => onClick(e, tag) : undefined}
        >
            {prefix}{tag}
        </span>
    );
}
