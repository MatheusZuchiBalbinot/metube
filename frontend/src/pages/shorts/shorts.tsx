import { memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clapperboard, ThumbsUp, ThumbsDown, Bookmark, ChevronDown, Info, X } from 'lucide-react';
import ReactionBtn from '@components/video/reactionBtn';
import SavePopover from '@components/video/savePopover';
import ShortPlayer from '@components/player/playerShort';
import { Avatar, Tooltip } from '@ui';
import TagBadge from '@components/tag/badge';
import type { Tag } from '@models';
import { useAppSelector } from '@store';
import { selectWatchLaterIds } from '@store/playlistSlice';
import './shorts.css';
import { useVideo } from '@hooks';
import { Format, ROUTES, cn, formatRelativeDate } from '@utils';
import { useShortReactions } from './hooks/useShortReactions';
import { useShortPanels } from './hooks/useShortPanels';
import { useShortsData } from './hooks/useShortsData';
import { useShortsRefs } from './hooks/useShortsRefs';
import { useShortsNavigation } from './hooks/useShortsNavigation';
import { useShortsFeedObserver } from './hooks/useShortsFeedObserver';
import VolumeIcon from './components/VolumeIcon';

const MAX_TAGS = 3;

interface ShortItemProps {
    video: ReturnType<typeof useVideo>['videos'][number];
    index: number;
    total: number;
    isActive: boolean;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    onVideoMounted: (el: HTMLVideoElement | null) => void;
    onEnded: () => void;
    onScrollNext: () => void;
    // Lifted volume/mute state — persists across short items
    muted: boolean;
    volume: number;
    watchLaterIds: Set<string>;
    onMuteChange: (muted: boolean) => void;
    onVolumeChange: (volume: number) => void;
}

interface ShortOverlayProps {
    video: ReturnType<typeof useVideo>['videos'][number];
    visibleTags: Tag[];
    onTagClick: (e: React.MouseEvent | React.KeyboardEvent, tag: Tag) => void;
    onChannelClick: (e: React.MouseEvent) => void;
}

function ShortOverlay({ video, visibleTags, onTagClick, onChannelClick }: ShortOverlayProps) {
    return (
        <div className="shorts-page__overlay">
            <button
                className="shorts-page__channel"
                onClick={onChannelClick}
                aria-label={video.channel}
            >
                <Avatar name={video.channel} size="sm" />
                <span className="shorts-page__channel-name">{video.channel}</span>
                <span className="shorts-page__views">{Format.views(video.views)} views</span>
            </button>

            <p className="shorts-page__title">{video.title}</p>

            {visibleTags.length > 0 && (
                <div className="shorts-page__tags">
                    {visibleTags.map(tag => (
                        <TagBadge
                            key={tag}
                            tag={tag}
                            prefix="#"
                            className="shorts-page__tag"
                            onClick={(e: React.MouseEvent | React.KeyboardEvent) => onTagClick(e, tag)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface ShortDescriptionProps {
    video: ReturnType<typeof useVideo>['videos'][number];
    visibleTags: Tag[];
    isOpen: boolean;
    onClose: (e: React.MouseEvent) => void;
    onTagClick: (e: React.MouseEvent | React.KeyboardEvent, tag: Tag) => void;
    onChannelClick: (e: React.MouseEvent) => void;
}

function ShortDescription({ video, visibleTags, isOpen, onClose, onTagClick, onChannelClick }: ShortDescriptionProps) {
    const { t } = useTranslation();
    return (
        <div
            className={cn('shorts-page__desc-panel', isOpen && 'shorts-page__desc-panel--open')}
            role="dialog"
            aria-label={t('shorts.description')}
        >
            <div className="shorts-page__desc-header">
                <span className="shorts-page__desc-title">{t('shorts.description')}</span>
                <button
                    className="shorts-page__desc-close"
                    aria-label={t('common.close')}
                    onClick={onClose}
                >
                    <X size={16} />
                </button>
            </div>
            <div className="shorts-page__desc-body">
                <button
                    className="shorts-page__desc-channel"
                    onClick={onChannelClick}
                    aria-label={video.channel}
                >
                    <Avatar name={video.channel} size="sm" />
                    <span>{video.channel}</span>
                </button>
                <p className="shorts-page__desc-video-title">{video.title}</p>
                {video.description && (
                    <p className="shorts-page__desc-text">{video.description}</p>
                )}
                <p className="shorts-page__desc-meta">
                    {Format.views(video.views)} views · {formatRelativeDate(video.publishedAt, 'en')}
                </p>
                {visibleTags.length > 0 && (
                    <div className="shorts-page__tags">
                        {visibleTags.map(tag => (
                            <TagBadge
                                key={tag}
                                tag={tag}
                                prefix="#"
                                className="shorts-page__tag"
                                onClick={(e: React.MouseEvent | React.KeyboardEvent) => onTagClick(e, tag)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const ShortItem = memo(function ShortItem({
    video, index, total, isActive, videoRef, onVideoMounted,
    onEnded, onScrollNext,
    muted, volume, onMuteChange, onVolumeChange, watchLaterIds,
}: ShortItemProps) {
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

    const visibleTags = video.tags.filter(tag => tag !== 'shorts').slice(0, MAX_TAGS);

    return (
        <div className="shorts-page__item">
            {/* Portrait stage — constrained to portrait width */}
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
                    {/* Counter */}
                    <span className="shorts-page__counter">
                        {t('shorts.counter', { current: index + 1, total })}
                    </span>

                    {/* Bottom overlay */}
                    <ShortOverlay
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

                    {/* Description overlay panel */}
                    <ShortDescription
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

                    {/* Scroll hint on first short */}
                    {index === 0 && (
                        <div className="shorts-page__scroll-hint" aria-hidden>
                            <ChevronDown size={18} />
                        </div>
                    )}
                </ShortPlayer>
            </div>{/* .shorts-page__stage */}

            {/* Side action panel — outside the stage */}
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

                {/* Description button */}
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

                {/* Volume control: icon toggles slider visibility */}
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

export default function ShortsPage() {
    const { t } = useTranslation();
    const watchLaterIds = useAppSelector(selectWatchLaterIds);
    const { shorts, muted, volume, setMuted, setVolume } = useShortsData();
    const { itemRefs, videoMap, videoRefs, mountVideo } = useShortsRefs(shorts.length);
    const { renderedIndex, activateIndex, scrollToIndex } = useShortsNavigation(shorts, videoMap, itemRefs);
    const feedRef = useRef<HTMLDivElement>(null);
    useShortsFeedObserver(feedRef, itemRefs, activateIndex, shorts.length);

    const isEmpty = shorts.length === 0;

    if (isEmpty) {
        return (
            <div className="shorts-page">
                <div className="shorts-page__empty">
                    <Clapperboard size={48} className="shorts-page__empty-icon" />
                    <p className="shorts-page__empty-title">{t('shorts.empty_title')}</p>
                    <p className="shorts-page__empty-desc">{t('shorts.empty_desc')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="shorts-page">
            <div className="shorts-page__feed" ref={feedRef}>
                {shorts.map((video, index) => {
                    const isWithinWindow = Math.abs(index - renderedIndex) <= 2;
                    return (
                        <div
                            key={video.id}
                            ref={el => {
                                itemRefs.current[index] = el;
                            }}
                            style={{ height: '100%' }}
                        >
                            {isWithinWindow && (
                                <ShortItem
                                    video={video}
                                    index={index}
                                    total={shorts.length}
                                    isActive={index === renderedIndex}
                                    videoRef={videoRefs.current[index]}
                                    onVideoMounted={el => mountVideo(index, el)}
                                    onEnded={() => scrollToIndex(index + 1)}
                                    onScrollNext={() => scrollToIndex(index + 1)}
                                    muted={muted}
                                    volume={volume}
                                    onMuteChange={setMuted}
                                    onVolumeChange={setVolume}
                                    watchLaterIds={watchLaterIds}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
