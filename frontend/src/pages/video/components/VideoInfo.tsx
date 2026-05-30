import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown, Bookmark, BookOpen } from 'lucide-react';
import ReactionBtn from '@components/video/reactionBtn';
import SavePopover from '@components/video/savePopover';
import TagBadge from '@components/tag/badge';
import { Avatar } from '@ui';
import { useAppDispatch } from '@store';
import { videoActions } from '@store/videoSlice';
import { Format, ROUTES, formatRelativeDate, cn } from '@utils';
import type { Video, VideoId } from '@models';
import type { VideoTranscription } from '@api';
import ShareMenu from './ShareMenu';
import type { UseVideoReactionsResult } from '../hooks/useVideoReactions';
import type { UseVideoShareResult } from '../hooks/useVideoShare';

interface VideoInfoProps {
    video: Video
    isOwner: boolean
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
}

export default function VideoInfo({
    video, isOwner, isChannelSubscribed, onSubscribe,
    reactions, isSaved, share,
    transcription, readingMode, onReadingModeToggle,
    descExpanded, onDescExpandToggle, language,
}: VideoInfoProps) {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const videoId = video.id as VideoId;
    const hasLongDesc = (video.description ?? '').length > 220;

    return (
        <div className="video-page__meta">
            <h1 className="video-page__title">{video.title}</h1>

            <div className="video-page__channel-row">
                <div className="video-page__channel-info">
                    <Link to={isOwner ? ROUTES.PROFILE : ROUTES.USER.replace(':id', video.channelId)} className="video-page__channel-link">
                        <Avatar name={video.channel} size="sm" />
                        <span className="video-page__channel-name">{video.channel}</span>
                    </Link>
                    <button
                        type="button"
                        className={cn('video-page__subscribe-btn', isChannelSubscribed && 'video-page__subscribe-btn--active')}
                        onClick={onSubscribe}
                        aria-pressed={isChannelSubscribed}
                    >
                        {isChannelSubscribed ? t('channel.subscribed') : t('channel.subscribe')}
                    </button>
                </div>

                <div className="video-page__actions">
                    <ReactionBtn
                        isActive={reactions.isLiked}
                        isAnimating={reactions.likeAnimating}
                        icon={<ThumbsUp size={20} strokeWidth={1.75} fill="none" />}
                        iconActive={<ThumbsUp size={20} strokeWidth={1.75} fill="currentColor" />}
                        label={t('video.like')}
                        activeLabel={t('video.liked')}
                        className="video-page__reaction-btn"
                        activeClass="video-page__reaction-btn--liked"
                        onClick={reactions.handleLike}
                    />
                    <ReactionBtn
                        isActive={reactions.isDisliked}
                        isAnimating={reactions.dislikeAnimating}
                        icon={<ThumbsDown size={20} strokeWidth={1.75} fill="none" />}
                        iconActive={<ThumbsDown size={20} strokeWidth={1.75} fill="currentColor" />}
                        label={t('video.dislike')}
                        activeLabel={t('video.disliked')}
                        className="video-page__reaction-btn"
                        activeClass="video-page__reaction-btn--disliked"
                        onClick={reactions.handleDislike}
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
                            onClick={() => { }}
                        />
                    </SavePopover>
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
                            onClick={onReadingModeToggle}
                        />
                    )}
                </div>
            </div>

            <div className="video-page__description-card">
                <div className="video-page__description-meta">
                    <span>{Format.views(video.views)} {t('video.views')}</span>
                    <span className="video-page__description-sep">·</span>
                    <span>{formatRelativeDate(video.publishedAt, language)}</span>
                </div>

                {video.description && (
                    <>
                        <p className={cn('video-page__description', !descExpanded && hasLongDesc && 'video-page__description--clamped')}>
                            {video.description}
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
                    </>
                )}

                {video.tags.length > 0 && (
                    <div className="video-page__tags">
                        {video.tags.map(tag => (
                            <TagBadge
                                key={tag}
                                tag={tag}
                                prefix="#"
                                onClick={() => dispatch(videoActions.openTagView({ tag, fromVideoId: video.id }))}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
