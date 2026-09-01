import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown, Bookmark, BookOpen, Sparkles, Bell, BellOff, Eye, Clock } from '@components/icons/icons';
import ReactionBtn from '@components/video/reactionBtn';
import ReactionPill from '@components/video/reactionPill';
import SavePopover from '@components/video/savePopover';
import TagBadge from '@components/tag/badge';
import TimestampedText from '@components/ui/timestamp/text';
import { Avatar } from '@ui';
import { Format, ROUTES, formatRelativeDate, cn } from '@utils';
import type { Video, VideoId, ViewCount, Tag } from '@models';
import type { VideoTranscription } from '@api';
import ShareMenu from './ShareMenu';
import type { UseVideoReactionsResult } from '../hooks/useVideoReactions';
import type { UseVideoShareResult } from '../hooks/useVideoShare';

interface VideoInfoProps {
    video: Video
    isOwner: boolean
    isAuthenticated: boolean
    isChannelSubscribed: boolean
    onSubscribe: () => void
    reactions: UseVideoReactionsResult
    isSaved: boolean
    share: UseVideoShareResult
    transcription: VideoTranscription | null
    readingMode: boolean
    onReadingModeToggle: () => void
    descExpanded: boolean
    onDescExpandToggle: () => void
    language: string
    onTagClick: (tag: Tag) => void
    onScrollToChat?: () => void
    onSeek?: (seconds: number) => void
}

export default function VideoInfo({
    video, isOwner, isAuthenticated, isChannelSubscribed, onSubscribe,
    reactions, isSaved, share,
    transcription, readingMode, onReadingModeToggle,
    descExpanded, onDescExpandToggle, language, onTagClick, onScrollToChat, onSeek,
}: VideoInfoProps) {
    const { t } = useTranslation();

    const videoId = video.id as VideoId;
    const hasLongDesc = (video.description ?? '').length > 220;

    return (
        <div className="video-page__meta">
            <h1 className="video-page__title">{video.title}</h1>

            <div className="video-page__channel-row">
                <div className="video-page__channel-info">
                    <Link to={isOwner ? ROUTES.PROFILE : ROUTES.USER.replace(':id', video.channelId)} className="video-page__channel-link">
                        <Avatar name={video.channel} size="sm" />
                        <div className="video-page__channel-text">
                            <span className="video-page__channel-name">{video.channel}</span>
                            {video.channelSubscribers !== undefined && (
                                <span className="video-page__channel-subs">
                                    {Format.views(video.channelSubscribers as unknown as ViewCount)} {t('channel.subscribers')}
                                </span>
                            )}
                        </div>
                    </Link>
                    {!isOwner && (
                        <button
                            type="button"
                            className={cn('video-page__subscribe-btn', isChannelSubscribed && 'video-page__subscribe-btn--active')}
                            onClick={onSubscribe}
                            aria-pressed={isChannelSubscribed}
                        >
                            {isChannelSubscribed
                                ? <><BellOff size={13} strokeWidth={2} />{t('channel.subscribed')}</>
                                : <><Bell size={13} strokeWidth={2} />{t('channel.subscribe')}</>
                            }
                        </button>
                    )}
                </div>

                <div className="video-page__actions">
                    {isAuthenticated && (
                        <>
                            <ReactionPill
                                isLiked={reactions.isLiked}
                                isDisliked={reactions.isDisliked}
                                isLikeAnimating={reactions.likeAnimating}
                                isDislikeAnimating={reactions.dislikeAnimating}
                                likeIcon={<ThumbsUp size={18} strokeWidth={1.75} fill="none" />}
                                likeIconActive={<ThumbsUp size={18} strokeWidth={1.75} fill="currentColor" />}
                                dislikeIcon={<ThumbsDown size={18} strokeWidth={1.75} fill="none" />}
                                dislikeIconActive={<ThumbsDown size={18} strokeWidth={1.75} fill="currentColor" />}
                                onLike={reactions.handleLike}
                                onDislike={reactions.handleDislike}
                            />
                            <SavePopover videoId={videoId}>
                                <ReactionBtn
                                    isActive={isSaved}
                                    icon={<Bookmark size={20} strokeWidth={1.75} fill="none" />}
                                    iconActive={<Bookmark size={20} strokeWidth={1.75} fill="currentColor" />}
                                    label={t('video.save')}
                                    activeLabel={t('video.saved')}
                                    className="video-page__reaction-btn"
                                    activeClass="video-page__reaction-btn--saved"
                                    showLabel={false}
                                    onClick={() => { }}
                                />
                            </SavePopover>

                            <span className="video-page__actions-sep" aria-hidden="true" />
                        </>
                    )}

                    <ShareMenu
                        isOpen={share.isShareDropdownOpen}
                        onOpenChange={share.setIsShareDropdownOpen}
                        isCopied={share.isCopied}
                        onCopyLink={share.handleShareCopyLink}
                        onCopyAtTime={share.handleShareCopyAtTime}
                    />
                    {transcription !== null && (
                        <ReactionBtn
                            isActive={readingMode}
                            icon={<BookOpen size={20} strokeWidth={1.75} />}
                            iconActive={<BookOpen size={20} strokeWidth={1.75} fill="currentColor" />}
                            label={t('video.reading_mode')}
                            activeLabel={t('video.exit_reading_mode')}
                            className="video-page__reaction-btn"
                            activeClass="video-page__reaction-btn--reading"
                            showLabel={false}
                            onClick={onReadingModeToggle}
                        />
                    )}
                    {onScrollToChat !== undefined && (
                        <span className="ai-border ai-border--circle">
                            <ReactionBtn
                                isActive={false}
                                icon={<Sparkles size={18} strokeWidth={1.75} />}
                                iconActive={<Sparkles size={18} strokeWidth={1.75} />}
                                label={t('chat.header')}
                                className="video-page__reaction-btn"
                                activeClass=""
                                showLabel={false}
                                onClick={onScrollToChat}
                            />
                        </span>
                    )}
                </div>
            </div>

            <div className="video-page__meta-bar">
                <Eye size={13} aria-hidden="true" />
                <span>{Format.views(video.views)} {t('video.views')}</span>
                <span className="video-page__description-sep">·</span>
                <Clock size={13} aria-hidden="true" />
                <span>{formatRelativeDate(video.publishedAt, language)}</span>
            </div>

            {video.description && (
                <div className="video-page__description-block">
                    <p className={cn('video-page__description', !descExpanded && hasLongDesc && 'video-page__description--clamped')}>
                        <TimestampedText text={video.description} onSeek={onSeek} />
                    </p>
                    {hasLongDesc && (
                        <button
                            type="button"
                            className="video-page__description-toggle"
                            onClick={onDescExpandToggle}
                        >
                            {descExpanded ? t('video.show_less') : t('video.show_more')}
                        </button>
                    )}
                </div>
            )}

            {video.tags.length > 0 && (
                <div className="video-page__tags">
                    {video.tags.map(tag => (
                        <TagBadge
                            key={tag}
                            tag={tag}
                            prefix="#"
                            onClick={() => onTagClick(tag)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
