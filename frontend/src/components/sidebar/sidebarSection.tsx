import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { cn, loadFromStorage, isObject, STORAGE_KEYS } from '@utils';

function readCollapsedSections(): Record<string, boolean> {
    return loadFromStorage<Record<string, boolean>>(STORAGE_KEYS.SIDEBAR_SECTIONS, {}, isObject);
}

function writeCollapsedSection(id: string, collapsed: boolean) {
    const current = readCollapsedSections();
    current[id] = collapsed;
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_SECTIONS, JSON.stringify(current));
}

interface SidebarSectionProps {
    id: string;
    label: string;
    railHidden?: boolean;
    children: React.ReactNode;
}

export function SidebarSection({ id, label, railHidden, children }: SidebarSectionProps) {
    const [collapsed, setCollapsed] = useState(() => readCollapsedSections()[id] ?? false);

    function handleToggle() {
        setCollapsed(prev => {
            const next = !prev;
            writeCollapsedSection(id, next);
            return next;
        });
    }

    return (
        <div className={cn('app-sidebar__section', railHidden && 'app-sidebar__section--rail-hidden')}>
            <button
                type="button"
                className="app-sidebar__section-header"
                onClick={handleToggle}
                aria-expanded={!collapsed}
            >
                <span className="app-sidebar__section-label">{label}</span>
                <ChevronDown
                    size={14}
                    strokeWidth={2}
                    className={cn('app-sidebar__section-chevron', collapsed && 'app-sidebar__section-chevron--collapsed')}
                />
            </button>
            {!collapsed && children}
        </div>
    );
}

interface ShowMoreToggleProps {
    expanded: boolean;
    onToggle: () => void;
}

export function ShowMoreToggle({ expanded, onToggle }: ShowMoreToggleProps) {
    const { t } = useTranslation();

    return (
        <button
            type="button"
            className="app-sidebar__show-more"
            onClick={onToggle}
            aria-expanded={expanded}
        >
            <ChevronDown
                size={16}
                strokeWidth={2}
                className={cn('app-sidebar__show-more-icon', expanded && 'app-sidebar__show-more-icon--up')}
            />
            <span>{expanded ? t('nav.show_less') : t('nav.show_more')}</span>
        </button>
    );
}
