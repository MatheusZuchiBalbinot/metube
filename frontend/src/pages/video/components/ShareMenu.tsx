import { Link2, Clock, Check, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as Popover from '@radix-ui/react-popover';
import { Tooltip } from '@ui';
import { cn } from '@utils';

interface ShareMenuProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    isCopied: boolean
    onCopyLink: () => void
    onCopyAtTime: () => void
}

export default function ShareMenu({ isOpen, onOpenChange, isCopied, onCopyLink, onCopyAtTime }: ShareMenuProps) {
    const { t } = useTranslation();

    const triggerClass = cn('video-page__reaction-btn', isCopied && 'video-page__reaction-btn--copied');

    return (
        <Popover.Root open={isOpen} onOpenChange={onOpenChange}>
            <Tooltip content={isCopied ? t('video.copied') : t('video.share')} side="top">
                <Popover.Trigger className={triggerClass} aria-label={t('video.share')}>
                    <span className="rbtn__icon">
                        {isCopied ? (
                            <Check size={20} strokeWidth={1.75} />
                        ) : (
                            <Link2 size={16} strokeWidth={1.75} />
                        )}
                    </span>
                </Popover.Trigger>
            </Tooltip>
            <Popover.Portal>
                <Popover.Content
                    className="video-page__share-dropdown"
                    side="top"
                    align="center"
                    sideOffset={8}
                    role="menu"
                >
                    <p className="video-page__share-header">
                        <Share2 size={12} aria-hidden="true" />
                        {t('video.share')}
                    </p>
                    <button
                        type="button"
                        className="video-page__share-option"
                        role="menuitem"
                        onClick={onCopyLink}
                    >
                        <span className="video-page__share-option-icon">
                            <Link2 size={14} strokeWidth={1.75} />
                        </span>
                        {t('video.share_copy_link')}
                    </button>
                    <button
                        type="button"
                        className="video-page__share-option"
                        role="menuitem"
                        onClick={onCopyAtTime}
                    >
                        <span className="video-page__share-option-icon">
                            <Clock size={14} strokeWidth={1.75} />
                        </span>
                        {t('video.share_copy_at_time')}
                    </button>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
