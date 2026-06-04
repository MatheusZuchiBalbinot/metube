import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown, Bookmark, ChevronDown, Info } from 'lucide-react';
import ReactionBtn from '@components/video/reactionBtn';
import SavePopover from '@components/video/savePopover';
import ShortPlayer from '@components/player/playerShort';
import { Tooltip } from '@ui';
import type { Tag } from '@models';
import { cn, ROUTES } from '@utils';
import { useVideo } from '@hooks';
import { useShortReactions } from '../hooks/useShortReactions';
import { useShortPanels } from '../hooks/useShortPanels';
import VolumeIcon from './VolumeIcon';
import ShortsOverlay from './ShortsOverlay';
import ShortsDescription from './ShortsDescription';

const MAX_TAGS = 3;

interface ShortsItemProps {
    video: ReturnType<typeof useVideo>['videos'][number];
    index: number;
    total: number;
    isActive: boolean;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    onVideoMounted: (el: HTMLVideoElement | null) => void;
    onEnded: () => void;
    onScrollNext: () => void;
    muted: boolean;
    volume: number;
    watchLaterIds: Set<string>;
    onMuteChange: (muted: boolean) => void;
    onVolumeChange: (volume: number) => void;
}

export { type ShortsItemProps };

const ShortsItem = memo(function ShortsItem({
    video, index, total, isActive, videoRef, onVideoMounted,
    onEnded, onScrollNext,
    muted, volume, onMuteChange, onVolumeChange, watchLaterIds,
}: ShortsItemProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { openTagView } = useVideo();
    const { isLiked, isDisliked, likeAnimating, dislikeAnimating, handleLike, handleDislike } = useShortReactions(video.id);
    const { showVolumeSlider, showDescription, handlePanelToggle, closeAll } = useShortPanels();

    const isSaved = watchLaterIds.has(video.id);
    const isLast = index === total - 1;
    const effectiveVolume = muted ? 0 : volume;
    const volumeFill = `${effectiveVolume * 100}%`;
    const muteLabel = muted ? t('shorts.unmute') : t('shorts.mute');

    const visibleTags = video.tags.filter(tag => tag !== 'shorts').slice(0, MAX_TAGS);

    function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
        e.stopPropagation();
        const val = parseFloat(e.target.value);
        const el = videoRef.current;
        const nextMuted = val === 0;

        if (el) {
            el.volume = val === 0 ? 0 : val;
            el.muted = nextMuted;
        }

        if (val > 0) {
            onVolumeChange(val);
        }

        onMuteChange(nextMuted);
    }

    function handleNavigation(dest: 'channel' | 'tag', value: string | Tag) {
        if (dest === 'channel') {
            navigate(ROUTES.USER.replace(':id', value as string));
        } else if (dest === 'tag') {
            openTagView(value as Tag, video.id);
        }
    }

    return (
        <div className="shorts-page__item">
            <div className="shorts-page__stage">
                <ShortPlayer
                    videoRef={videoRef}
                    src={video.videoUrl ?? ''}
                    captureKeyboard={isActive}
                    controlledMuted={muted}
                    controlledVolume={volume}
                    onMuteChange={onMuteChange}
                    onVolumeChange={onVolumeChange}
                    onVideoMounted={onVideoMounted}
                    onEnded={onEnded}
                    onTap={closeAll}
                >
                    <span className="shorts-page__counter">
                        {t('shorts.counter', { current: index + 1, total })}
                    </span>

                    <ShortsOverlay
                        video={video}
                        visibleTags={visibleTags}
                        onTagClick={(e: React.MouseEvent | React.KeyboardEvent, tag: Tag) => {
                            e.stopPropagation();
                            handleNavigation('tag', tag);
                        }}
                        onChannelClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleNavigation('channel', video.channelId);
                        }}
                    />

                    <ShortsDescription
                        video={video}
                        visibleTags={visibleTags}
                        isOpen={showDescription}
                        onClose={e => handlePanelToggle(e, 'description')}
                        onTagClick={(e: React.MouseEvent | React.KeyboardEvent, tag: Tag) => {
                            e.stopPropagation();
                            handleNavigation('tag', tag);
                        }}
                        onChannelClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleNavigation('channel', video.channelId);
                        }}
                    />

                    {index === 0 && (
                        <div className="shorts-page__scroll-hint" aria-hidden>
                            <ChevronDown size={18} />
                        </div>
                    )}
                </ShortPlayer>
            </div>

            <div className="shorts-page__side">
                <ReactionBtn
                    isActive={isLiked}
                    isAnimating={likeAnimating}
                    icon={<ThumbsUp size={22} strokeWidth={1.75} fill="none" />}
                    iconActive={<ThumbsUp size={22} strokeWidth={1.75} fill="currentColor" />}
                    label={t('video.like')}
                    activeLabel={t('video.liked')}
                    className="shorts-page__action"
                    activeClass="shorts-page__action--liked"
                    tooltipSide="right"
                    onClick={handleLike}
                />

                <ReactionBtn
                    isActive={isDisliked}
                    isAnimating={dislikeAnimating}
                    icon={<ThumbsDown size={22} strokeWidth={1.75} fill="none" />}
                    iconActive={<ThumbsDown size={22} strokeWidth={1.75} fill="currentColor" />}
                    label={t('video.dislike')}
                    activeLabel={t('video.disliked')}
                    className="shorts-page__action"
                    activeClass="shorts-page__action--disliked"
                    tooltipSide="right"
                    onClick={handleDislike}
                />

                <SavePopover videoId={video.id}>
                    <ReactionBtn
                        isActive={isSaved}
                        icon={<Bookmark size={22} strokeWidth={1.75} fill="none" />}
                        iconActive={<Bookmark size={22} strokeWidth={1.75} fill="currentColor" />}
                        label={t('video.save')}
                        activeLabel={t('video.saved')}
                        className="shorts-page__action"
                        activeClass="shorts-page__action--saved"
                        tooltipSide="right"
                        onClick={() => { }}
                    />
                </SavePopover>

                <Tooltip content={t('shorts.description')} side="right">
                    <button
                        className={cn('shorts-page__action', showDescription && 'shorts-page__action--active')}
                        aria-label={t('shorts.description')}
                        aria-pressed={showDescription}
                        onClick={e => handlePanelToggle(e, 'description')}
                    >
                        <span className="rbtn__icon">
                            <Info size={22} strokeWidth={1.75} />
                        </span>
                        <span className="rbtn__label">{t('shorts.description')}</span>
                    </button>
                </Tooltip>

                <div className="shorts-page__volume">
                    <Tooltip content={muteLabel} side="right">
                        <button
                            className="shorts-page__action"
                            aria-label={muteLabel}
                            onClick={e => handlePanelToggle(e, 'volume')}
                        >
                            <span className="rbtn__icon">
                                <VolumeIcon volume={effectiveVolume} />
                            </span>
                        </button>
                    </Tooltip>
                    <div className={cn('shorts-page__volume-slider-wrap', showVolumeSlider && 'shorts-page__volume-slider-wrap--open')}>
                        <input
                            type="range"
                            className="shorts-page__volume-slider"
                            min={0}
                            max={1}
                            step={0.02}
                            value={effectiveVolume}
                            onChange={handleVolumeChange}
                            onClick={e => e.stopPropagation()}
                            aria-label={t('shorts.volume')}
                            style={{
                                background: `linear-gradient(to top, rgba(255,255,255,0.9) ${volumeFill}, rgba(255,255,255,0.2) ${volumeFill})`,
                            }}
                        />
                    </div>
                </div>

                {!isLast && (
                    <Tooltip content={t('shorts.next')} side="right">
                        <button
                            className="shorts-page__nav-btn"
                            aria-label={t('shorts.next')}
                            onClick={e => {
                                e.stopPropagation(); onScrollNext();
                            }}
                        >
                            <ChevronDown size={20} strokeWidth={2} />
                        </button>
                    </Tooltip>
                )}
            </div>
        </div>
    );
});

export default ShortsItem;
