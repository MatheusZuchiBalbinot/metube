import { useTranslation } from 'react-i18next';
import { cn } from '@utils';
import type { Tag } from '@models';

interface CategoryChipsProps {
    tags: Tag[];
    selected: Tag | null;
    onSelect: (tag: Tag | null) => void;
}

export default function CategoryChips({ tags, selected, onSelect }: CategoryChipsProps) {
    const { t } = useTranslation();

    if (tags.length === 0) {
        return null;
    }

    return (
        <div className="home-chips" role="tablist" aria-label={t('home.categories')}>
            <button
                type="button"
                role="tab"
                aria-selected={selected === null}
                className={cn('home-chip', selected === null && 'home-chip--active')}
                onClick={() => onSelect(null)}
            >
                {t('home.category_all')}
            </button>
            {tags.map(tag => (
                <button
                    key={tag}
                    type="button"
                    role="tab"
                    aria-selected={selected === tag}
                    className={cn('home-chip', selected === tag && 'home-chip--active')}
                    onClick={() => onSelect(tag)}
                >
                    {tag}
                </button>
            ))}
        </div>
    );
}
