import type { Tag } from '@models/tag';
import { TagColors } from '@utils/tagColors';
import './badge.css';

interface TagBadgeProps {
    tag: Tag;
    prefix?: string;
    className?: string;
    title?: string;
    onClick?: (e: React.MouseEvent | React.KeyboardEvent, tag: Tag) => void;
}

export default function TagBadge({ tag, prefix, className, title, onClick }: TagBadgeProps) {
    const palette = TagColors.palette(tag);
    const isClickable = onClick !== undefined;

    const cls = ['tag-badge', isClickable ? 'tag-badge--clickable' : '', className]
        .filter(Boolean)
        .join(' ');

    function handleKeyDown(e: React.KeyboardEvent<HTMLSpanElement>) {
        const isActivationKey = e.key === 'Enter' || e.key === ' ';
        if (!isActivationKey || !onClick) {
            return;
        }
        e.preventDefault();
        onClick(e, tag);
    }

    return (
        <span
            className={cls}
            style={{ background: palette.bg, color: palette.color }}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            title={title}
            onClick={isClickable ? e => onClick(e, tag) : undefined}
            onKeyDown={isClickable ? handleKeyDown : undefined}
        >
            {prefix}{tag}
        </span>
    );
}
