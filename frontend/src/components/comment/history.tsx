import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { History, Check } from 'lucide-react';
import { Spinner } from '@ui';
import { Format } from '@utils/format';
import { comments as commentsApi } from '@api';
import type { Cuid } from '@api/comments';
import type { CommentVersion } from '@models/comment';
import './history.css';

interface CommentHistoryProps {
    cuid: Cuid
    selectedVersion: CommentVersion | null
    onVersionSelect: (version: CommentVersion | null) => void
}

export default function CommentHistory({ cuid, selectedVersion, onVersionSelect }: CommentHistoryProps) {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [versions, setVersions] = useState<CommentVersion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const isViewingOldVersion = selectedVersion !== null;

    const close = useCallback(() => setIsOpen(false), []);

    useEffect(() => {
        const hasLoaded = versions.length > 0;

        if (!isOpen || hasLoaded) {
            return;
        }

        async function load() {
            setIsLoading(true);
            const result = await commentsApi.versions(cuid as string);
            setIsLoading(false);

            if (result !== null) {
                setVersions(result);
            }
        }

        void load();
    }, [isOpen, cuid, versions.length]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handleClickOutside(e: MouseEvent) {
            const clickedOutside = containerRef.current !== null
                && !containerRef.current.contains(e.target as Node);

            if (clickedOutside) {
                close();
            }
        }

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, close]);

    const triggerClass = [
        'comment-history__trigger',
        isViewingOldVersion ? 'comment-history__trigger--active' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className="comment-history" ref={containerRef}>
            <button
                className={triggerClass}
                onClick={() => setIsOpen(v => !v)}
                aria-label={t('comments.view_history')}
                aria-expanded={isOpen}
            >
                <History size={11} />
                {t('comments.edited')}
            </button>

            {isOpen && (
                <div className="comment-history__dropdown" role="listbox">
                    {isLoading && (
                        <div className="comment-history__loading">
                            <Spinner size="sm" />
                        </div>
                    )}

                    {!isLoading && versions.map((v, idx) => {
                        const isCurrent = idx === 0;
                        const isSelected = isCurrent
                            ? selectedVersion === null
                            : selectedVersion?.version === v.version;

                        return (
                            <button
                                key={v.version}
                                className={[
                                    'comment-history__option',
                                    isSelected ? 'comment-history__option--selected' : '',
                                ].filter(Boolean).join(' ')}
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                    onVersionSelect(isCurrent ? null : v);
                                    close();
                                }}
                            >
                                <span className="comment-history__option-label">
                                    {isCurrent
                                        ? t('comments.history_current')
                                        : t('comments.history_version', { n: v.version })}
                                </span>
                                <span className="comment-history__option-date">
                                    {Format.relativeDate(v.createdAt, i18n.language)}
                                </span>
                                {isSelected && <Check size={12} className="comment-history__option-check" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
