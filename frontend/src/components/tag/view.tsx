import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useVideo } from '@context/useVideo';
import { TagColors } from '@utils/tagColors';
import VideoHero from '@components/video/hero';
import VideoRow from '@components/video/row';
import { Badge, Button, Tooltip } from '@ui';
import './view.css';

export default function TagView() {
    const { t } = useTranslation();
    const { videos, activeTagView, closeTagView } = useVideo();

    const tag = activeTagView!.tag;
    const fromVideoId = activeTagView!.fromVideoId;
    const lowerTag = tag.toLowerCase();
    const tagPalette = TagColors.palette(tag);

    const taggedVideos = useMemo(() => {
        const matched = videos.filter(v =>
            v.tags.some(vt => vt.toLowerCase() === lowerTag),
        );

        const isFromVideoFirst = fromVideoId !== null && matched[0]?.id === fromVideoId;
        if (isFromVideoFirst) { return matched; }

        const fromIndex = matched.findIndex(v => v.id === fromVideoId);
        const hasFromVideo = fromIndex > 0;

        if (!hasFromVideo) {
            return matched.sort(
                (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
            );
        }

        const sorted = [...matched].sort(
            (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
        );
        const fromVideo = sorted.splice(sorted.findIndex(v => v.id === fromVideoId), 1)[0];
        return [fromVideo, ...sorted];
    }, [videos, lowerTag, fromVideoId]);

    const hasFromVideo = fromVideoId !== null;
    const heroVideo = hasFromVideo ? taggedVideos[0] : null;
    const listVideos = hasFromVideo ? taggedVideos.slice(1) : taggedVideos;
    const hasOtherVideos = listVideos.length > 0;

    return (
        <div className="tag-view">
            <div className="tag-view__header">
                <Tooltip content={t('common.back')} side="right">
                    <Button variant="ghost" className="tag-view__back" onClick={closeTagView} aria-label={t('common.back')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                        {t('common.back')}
                    </Button>
                </Tooltip>
                <div className="tag-view__title">
                    <span
                        className="tag-view__tag-chip"
                        style={{ background: tagPalette.bg, color: tagPalette.color }}
                    >
                        {tag}
                    </span>
                    <Badge variant="neutral">{taggedVideos.length}</Badge>
                </div>
            </div>

            <div className="tag-view__list">
                {hasFromVideo && heroVideo && (
                    <>
                        <p className="tag-view__section-label">{t('tag.fromThisVideo')}</p>
                        <VideoHero video={heroVideo} />
                    </>
                )}

                {hasFromVideo && hasOtherVideos && (
                    <p className="tag-view__section-label tag-view__section-label--others">
                        {t('tag.otherVideos')} · {listVideos.length}
                    </p>
                )}

                {listVideos.map(video => (
                    <VideoRow key={video.id} video={video} />
                ))}
            </div>
        </div>
    );
}
