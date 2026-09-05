import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from '@components/icons/icons';
import { TagColors } from '@utils';
import VideoHero from '@components/video/hero';
import VideoRow from '@components/video/row';
import { Badge, Button } from '@ui';
import type { Video } from '@models';
import type { TagView as TagViewState } from '@store/videoUiSlice';
import './view.css';
import { useVideoData, useVideoUi } from '@hooks';

function getTagViewMeta(activeTagView: TagViewState | null) {
    return {
        tag: activeTagView?.tag ?? '',
        fromVideoId: activeTagView?.fromVideoId ?? null,
    };
}

function shouldShowHeroSection(hasFromVideo: boolean, heroVideo: Video | null): heroVideo is Video {
    return hasFromVideo && heroVideo !== null;
}

function shouldShowOthersLabel(hasFromVideo: boolean, hasOtherVideos: boolean) {
    return hasFromVideo && hasOtherVideos;
}

export default function TagView() {
    const { t } = useTranslation();
    const { videos } = useVideoData();
    const { activeTagView, closeTagView } = useVideoUi();

    const { tag, fromVideoId } = getTagViewMeta(activeTagView);
    const lowerTag = tag.toLowerCase();
    const tagPalette = TagColors.palette(tag);

    const taggedVideos = useMemo(() => {
        if (activeTagView === null) {
            return [];
        }

        const matched = videos.filter((v: Video) =>
            v.tags.some(vt => vt.toLowerCase() === lowerTag),
        );

        const isFromVideoFirst = fromVideoId !== null && matched[0]?.id === fromVideoId;
        if (isFromVideoFirst) {
            return matched;
        }

        const fromIndex = matched.findIndex((v: Video) => v.id === fromVideoId);
        const hasFromVideo = fromIndex > 0;

        if (!hasFromVideo) {
            return matched.sort(
                (a: Video, b: Video) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
            );
        }

        const sorted = [...matched].sort(
            (a: Video, b: Video) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
        );
        const fromVideo = sorted.splice(sorted.findIndex((v: Video) => v.id === fromVideoId), 1)[0];
        return [fromVideo, ...sorted];
    }, [videos, lowerTag, fromVideoId, activeTagView]);

    if (activeTagView === null) {
        return null;
    }

    const hasFromVideo = fromVideoId !== null;
    const heroVideo = hasFromVideo ? taggedVideos[0] : null;
    const listVideos = hasFromVideo ? taggedVideos.slice(1) : taggedVideos;
    const hasOtherVideos = listVideos.length > 0;

    return (
        <div className="tag-view">
            <div className="tag-view__header">
                <Button variant="ghost" size="sm" className="tag-view__back" leftIcon={<ArrowLeft size={14} strokeWidth={2} />} onClick={closeTagView}>
                    {t('common.back')}
                </Button>
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
                {shouldShowHeroSection(hasFromVideo, heroVideo) && (
                    <>
                        <p className="tag-view__section-label">{t('tag.fromThisVideo')}</p>
                        <VideoHero video={heroVideo} />
                    </>
                )}

                {shouldShowOthersLabel(hasFromVideo, hasOtherVideos) && (
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
