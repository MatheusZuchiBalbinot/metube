import { useTranslation } from 'react-i18next';
import type { Tag } from '@models';
import { TagColors, type FilterState } from '@utils';

interface Props {
    allTags: Tag[]
    value: FilterState
    onToggle: (tag: Tag) => void
}

interface TagChipProps {
    tag: Tag
    isActive: boolean
    onToggle: (tag: Tag) => void
}

function buildTagChipStyle(tag: string, isActive: boolean): React.CSSProperties | undefined {
    if (!isActive) {
        return undefined;
    }

    const palette = TagColors.palette(tag);

    return {
        background: palette.bg,
        color: palette.color,
        borderColor: `${palette.color}55`,
    };
}

function TagChip({ tag, isActive, onToggle }: TagChipProps) {
    function handleClick() {
        onToggle(tag);
    }

    return (
        <button
            type="button"
            className={`filter-panel__tag-chip${isActive ? ' filter-panel__tag-chip--active' : ''}`}
            style={buildTagChipStyle(tag, isActive)}
            onClick={handleClick}
            aria-pressed={isActive}
            aria-label={tag}
        >
            {tag}
        </button>
    );
}

export default function FilterTags({ allTags, value, onToggle }: Props) {
    const { t } = useTranslation();

    return (
        <div className="filter-panel__dropdown-section">
            <span className="filter-panel__dropdown-label">{t('video.filter_by_tags')}</span>
            <div className="filter-panel__dropdown-tags">
                {allTags.map(tag => (
                    <TagChip
                        key={tag}
                        tag={tag}
                        isActive={value.tags.includes(tag)}
                        onToggle={onToggle}
                    />
                ))}
            </div>
        </div>
    );
}
