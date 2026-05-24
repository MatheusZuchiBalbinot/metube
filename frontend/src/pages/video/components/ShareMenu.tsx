import { Link2, Clock, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as Popover from '@radix-ui/react-popover';
import { Button } from '@ui';
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
            <Popover.Trigger className={triggerClass} aria-label={t('video.share')}>
                <span className="rbtn__icon">
                    {isCopied ? (
                        <Check size={20} strokeWidth={1.75} />
                    ) : (
                        <Link2 size={16} strokeWidth={1.75} />
                    )}
                </span>
                <span className="rbtn__label">
                    {isCopied ? t('video.copied') : t('video.share')}
                </span>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    className="video-page__share-dropdown"
                    side="top"
                    align="center"
                    sideOffset={6}
                    role="menu"
                >
                    <Button
                        variant="ghost"
                        size="sm"
                        className="video-page__share-option"
                        role="menuitem"
                        leftIcon={<Link2 size={14} strokeWidth={1.75} />}
                        onClick={onCopyLink}
                    >
                        {t('video.share_copy_link')}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="video-page__share-option"
                        role="menuitem"
                        leftIcon={<Clock size={14} strokeWidth={1.75} />}
                        onClick={onCopyAtTime}
                    >
                        {t('video.share_copy_at_time')}
                    </Button>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
