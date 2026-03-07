import { useEffect, useRef, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, ThumbsDown, Bookmark, Link2, VideoOff } from 'lucide-react';
import VideoCard from '@components/video/card';
import { useVideo } from '@context/useVideo';
import { Format } from '@utils/format';
import { Button, Tooltip } from '@ui';
import './video.css';

export default function VideoPage() {
    const { t, i18n } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const { videos, likedVideos, dislikedVideos, savedVideos, likeVideo, dislikeVideo, saveVideo, watchVideo } = useVideo();

    const video = videos.find(v => v.id === id);
    const hasVideo = video !== undefined;

    const registeredRef = useRef(false);

    const [likeAnimating, setLikeAnimating] = useState(false);
    const [dislikeAnimating, setDislikeAnimating] = useState(false);
    const [saveAnimating, setSaveAnimating] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        const shouldRegister = hasVideo && !registeredRef.current;
        if (!shouldRegister) { return; }
        registeredRef.current = true;
        watchVideo(id!);
    }, [id, hasVideo, watchVideo]);

    const relatedVideos = useMemo(() => {
        const isVideoMissing = !hasVideo;
        if (isVideoMissing) { return []; }
        const videoTagSet = new Set(video!.tags);
        return videos
            .filter(v => v.id !== video!.id && v.tags.some(t => videoTagSet.has(t)))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);
    }, [hasVideo, video, videos]);

    if (!hasVideo) {
        return (
            <div className="video-page">
                <div className="video-page__not-found">
                    <p>{t('video.not_found')}</p>
                </div>
            </div>
        );
    }

    const isLiked = likedVideos.has(video.id);
    const isDisliked = dislikedVideos.has(video.id);
    const isSaved = savedVideos.has(video.id);
    const hasVideoFile = video.videoUrl !== undefined && video.videoUrl !== '';

    function handleLike() {
        likeVideo(video.id);
        setLikeAnimating(true);
        setTimeout(() => setLikeAnimating(false), 400);
    }

    function handleDislike() {
        dislikeVideo(video.id);
        setDislikeAnimating(true);
        setTimeout(() => setDislikeAnimating(false), 400);
    }

    function handleSave() {
        saveVideo(video.id);
        setSaveAnimating(true);
        setTimeout(() => setSaveAnimating(false), 400);
    }

    function handleShare() {
        navigator.clipboard.writeText(window.location.href);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }

    const likeBtnClass = [
        'video-page__action-btn',
        isLiked ? 'video-page__action-btn--like-active' : '',
        likeAnimating ? 'video-page__action-btn--animating' : '',
    ].filter(Boolean).join(' ');

    const dislikeBtnClass = [
        'video-page__action-btn',
        isDisliked ? 'video-page__action-btn--dislike-active' : '',
        dislikeAnimating ? 'video-page__action-btn--animating' : '',
    ].filter(Boolean).join(' ');

    const saveBtnClass = [
        'video-page__action-btn',
        isSaved ? 'video-page__action-btn--save-active' : '',
        saveAnimating ? 'video-page__action-btn--animating' : '',
    ].filter(Boolean).join(' ');

    const shareBtnClass = [
        'video-page__action-btn',
        isCopied ? 'video-page__action-btn--copied' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className="video-page">
            <div className="video-page__layout">
                <main className="video-page__main">
                    <div className="video-page__player">
                        {hasVideoFile ? (
                            <video
                                className="video-page__player-video"
                                src={video.videoUrl}
                                controls
                            />
                        ) : (
                            <div className="video-page__player-fallback">
                                <img
                                    src={video.thumbnail}
                                    alt={video.title}
                                    className="video-page__player-fallback-img"
                                />
                                <div className="video-page__player-fallback-msg">
                                    <VideoOff size={32} strokeWidth={1.5} />
                                    <p>{t('video.no_video_file')}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="video-page__meta">
                        <h1 className="video-page__title">{video.title}</h1>

                        <div className="video-page__stats-row">
                            <div className="video-page__stats">
                                <span>{Format.views(video.views)} {t('video.views')}</span>
                                <span className="video-page__stats-sep">·</span>
                                <span>{Format.relativeDate(video.publishedAt, i18n.language)}</span>
                                <span className="video-page__stats-sep">·</span>
                                <span className="video-page__channel">{video.channel}</span>
                            </div>

                            <div className="video-page__actions">
                                <Tooltip content={isLiked ? t('video.liked') : t('video.like')} side="top">
                                    <Button
                                        variant="ghost"
                                        className={likeBtnClass}
                                        onClick={handleLike}
                                        aria-pressed={isLiked}
                                        aria-label={isLiked ? t('video.liked') : t('video.like')}
                                    >
                                        <Heart
                                            className="video-page__action-icon"
                                            size={15}
                                            strokeWidth={2}
                                            fill={isLiked ? 'currentColor' : 'none'}
                                        />
                                        {isLiked ? t('video.liked') : t('video.like')}
                                    </Button>
                                </Tooltip>

                                <Tooltip content={isDisliked ? t('video.disliked') : t('video.dislike')} side="top">
                                    <Button
                                        variant="ghost"
                                        className={dislikeBtnClass}
                                        onClick={handleDislike}
                                        aria-pressed={isDisliked}
                                        aria-label={isDisliked ? t('video.disliked') : t('video.dislike')}
                                    >
                                        <ThumbsDown
                                            className="video-page__action-icon"
                                            size={15}
                                            strokeWidth={2}
                                            fill={isDisliked ? 'currentColor' : 'none'}
                                        />
                                        {isDisliked ? t('video.disliked') : t('video.dislike')}
                                    </Button>
                                </Tooltip>

                                <Tooltip content={isSaved ? t('video.saved') : t('video.save')} side="top">
                                    <Button
                                        variant="ghost"
                                        className={saveBtnClass}
                                        onClick={handleSave}
                                        aria-pressed={isSaved}
                                        aria-label={isSaved ? t('video.saved') : t('video.save')}
                                    >
                                        <Bookmark
                                            className="video-page__action-icon"
                                            size={15}
                                            strokeWidth={2}
                                            fill={isSaved ? 'currentColor' : 'none'}
                                        />
                                        {isSaved ? t('video.saved') : t('video.save')}
                                    </Button>
                                </Tooltip>

                                <Tooltip content={isCopied ? t('video.copied') : t('video.share')} side="top">
                                    <Button
                                        variant="ghost"
                                        className={shareBtnClass}
                                        onClick={handleShare}
                                        aria-label={t('video.share')}
                                    >
                                        <Link2
                                            className="video-page__action-icon"
                                            size={15}
                                            strokeWidth={2}
                                        />
                                        <span className="video-page__share-label">
                                            {isCopied ? t('video.copied') : t('video.share')}
                                        </span>
                                    </Button>
                                </Tooltip>
                            </div>
                        </div>

                        {video.description && (
                            <p className="video-page__description">{video.description}</p>
                        )}

                        {video.tags.length > 0 && (
                            <div className="video-page__tags">
                                {video.tags.map(tag => (
                                    <span key={tag} className="video-page__tag">{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </main>

                {relatedVideos.length > 0 && (
                    <aside className="video-page__sidebar">
                        <h2 className="video-page__sidebar-title">{t('video.related')}</h2>
                        <div className="video-page__sidebar-list">
                            {relatedVideos.map(v => (
                                <VideoCard key={v.id} video={v} />
                            ))}
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
