import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ListVideo } from 'lucide-react';
import { ROUTES, videoUrl, TagColors, isWithinDays } from '@utils';
import { Tooltip, Avatar } from '@ui';
import { useSubscriptions, useSubscription, useVideoData, useVideoUi, usePlaylist, useCollapsibleList } from '@hooks';
import { useAppSelector } from '@store';
import { selectVideoEntities, selectWatchedTagFrequency } from '@store/videoSelectors';
import { selectRecentChannels } from '@store/recentChannelsSelectors';
import { domain } from '@domain';
import type { Video, Tag, ChannelId } from '@models';
import { SidebarLink } from './sidebarNav';
import { SidebarSection, ShowMoreToggle } from './sidebarSection';

const MAX_CONTINUE_WATCHING = 4;
const RESUMABLE_MAX_PROGRESS = 95;

const RING_RADIUS = 7;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({ progress }: { progress: number }) {
    const offset = RING_CIRCUMFERENCE * (1 - progress / 100);

    return (
        <svg className="app-sidebar__ring" viewBox="0 0 18 18" aria-hidden="true">
            <circle className="app-sidebar__ring-track" cx="9" cy="9" r={RING_RADIUS} />
            <circle
                className="app-sidebar__ring-fill"
                cx="9"
                cy="9"
                r={RING_RADIUS}
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={offset}
            />
        </svg>
    );
}

export function ContinueWatchingSection() {
    const { t } = useTranslation();
    const { watchHistory, videoProgress } = useVideoData();
    const videoEntities = useAppSelector(selectVideoEntities);

    const items = useMemo(() => {
        const result: { video: Video; progress: number }[] = [];
        for (const id of watchHistory) {
            const progress = videoProgress[id] ?? 0;
            const isResumable = progress > 0 && progress < RESUMABLE_MAX_PROGRESS;
            if (!isResumable) {
                continue;
            }

            const video = videoEntities[id];
            if (!video) {
                continue;
            }

            result.push({ video, progress });
            if (result.length >= MAX_CONTINUE_WATCHING) {
                break;
            }
        }
        return result;
    }, [videoEntities, watchHistory, videoProgress]);

    const hasItems = items.length > 0;
    if (!hasItems) {
        return null;
    }

    return (
        <SidebarSection id="continue" label={t('nav.continue_watching')} railHidden>
            <ul className="app-sidebar__continue-list">
                {items.map(({ video, progress }) => (
                    <li key={video.id}>
                        <NavLink to={videoUrl(video.id)} className="app-sidebar__continue-item" title={video.title}>
                            <span className="app-sidebar__continue-thumb">
                                <img src={video.thumbnail} alt="" loading="lazy" decoding="async" />
                                <ProgressRing progress={progress} />
                            </span>
                            <span className="app-sidebar__continue-meta">
                                <span className="app-sidebar__continue-title">{video.title}</span>
                                <span className="app-sidebar__continue-channel">{video.channel}</span>
                            </span>
                        </NavLink>
                    </li>
                ))}
            </ul>
        </SidebarSection>
    );
}

const COLLAPSED_SUBSCRIPTIONS = 7;
const NEW_VIDEO_WINDOW_DAYS = 14;

/**
 * Channel ids that published a recent video the user hasn't watched yet — used to
 * surface a "new video" dot on subscribed channels.
 */
function useChannelsWithNewVideos(): Set<string> {
    const { publishedVideos, watchHistory } = useVideoData();

    return useMemo(() => {
        const watched = new Set(watchHistory);
        const result = new Set<string>();
        for (const video of publishedVideos) {
            const isRecent = isWithinDays(video.publishedAt, NEW_VIDEO_WINDOW_DAYS);
            const isUnwatched = !watched.has(video.id);
            if (isRecent && isUnwatched) {
                result.add(video.channelId);
            }
        }
        return result;
    }, [publishedVideos, watchHistory]);
}

export function SubscriptionsSection() {
    const { t } = useTranslation();
    const { channels, isLoading } = useSubscriptions();
    const newVideoChannels = useChannelsWithNewVideos();
    const { visible: visibleChannels, isOverflowing, expanded, toggle } = useCollapsibleList(channels, COLLAPSED_SUBSCRIPTIONS);

    if (isLoading) {
        return null;
    }

    const hasSubscriptions = channels.length > 0;

    if (!hasSubscriptions) {
        return (
            <div className="app-sidebar__section">
                <span className="app-sidebar__section-label">{t('nav.subscriptions')}</span>
                <p className="app-sidebar__empty">{t('nav.no_subscriptions')}</p>
                <NavLink to={ROUTES.HOME} className="app-sidebar__empty-cta">
                    {t('nav.explore_channels')}
                </NavLink>
            </div>
        );
    }

    return (
        <SidebarSection id="subscriptions" label={t('nav.subscriptions')}>
            <ul className="app-sidebar__list">
                {visibleChannels.map(ch => {
                    const channelPath = ROUTES.USER.replace(':id', ch.uuid);
                    const hasNewVideo = newVideoChannels.has(ch.uuid);
                    return (
                        <li key={ch.uuid}>
                            <Tooltip content={ch.name} side="right">
                                <SidebarLink to={channelPath} end={false} aria-label={ch.name}>
                                    <span className="app-sidebar__icon-chip">
                                        <Avatar name={ch.name} src={ch.avatar} size="sm" />
                                        {hasNewVideo && (
                                            <span className="app-sidebar__dot" aria-label={t('nav.new_videos')} />
                                        )}
                                    </span>
                                    <span className="app-sidebar__label">{ch.name}</span>
                                </SidebarLink>
                            </Tooltip>
                        </li>
                    );
                })}
            </ul>
            {isOverflowing && <ShowMoreToggle expanded={expanded} onToggle={toggle} />}
        </SidebarSection>
    );
}

const COLLAPSED_PLAYLISTS = 7;

export function PlaylistsSection() {
    const { t } = useTranslation();
    const { playlists } = usePlaylist();

    const userPlaylists = useMemo(
        () => playlists.filter(p => !domain.playlist.isWatchLater(p)),
        [playlists],
    );

    const { visible: visiblePlaylists, isOverflowing, expanded, toggle } = useCollapsibleList(userPlaylists, COLLAPSED_PLAYLISTS);

    const hasPlaylists = userPlaylists.length > 0;
    if (!hasPlaylists) {
        return null;
    }

    return (
        <SidebarSection id="playlists" label={t('nav.playlists')} railHidden>
            <ul className="app-sidebar__list">
                {visiblePlaylists.map(p => {
                    const palette = TagColors.palette(p.name);
                    const to = `${ROUTES.PLAYLISTS}?open=${p.id}`;
                    return (
                        <li key={p.id}>
                            <NavLink to={to} className="app-sidebar__playlist" title={p.name}>
                                <span
                                    className="app-sidebar__playlist-chip"
                                    style={{ background: palette.bg, color: palette.color }}
                                    aria-hidden="true"
                                >
                                    <ListVideo size={13} strokeWidth={2} />
                                </span>
                                <span className="app-sidebar__playlist-name">{p.name}</span>
                                <span className="app-sidebar__playlist-count">{p.videoIds.length}</span>
                            </NavLink>
                        </li>
                    );
                })}
            </ul>
            {isOverflowing && <ShowMoreToggle expanded={expanded} onToggle={toggle} />}
        </SidebarSection>
    );
}

const MAX_TOPICS = 6;

export function TopicsSection() {
    const { t } = useTranslation();
    const { openTagView } = useVideoUi();
    const tagFrequency = useAppSelector(selectWatchedTagFrequency);

    const topTags = useMemo(
        () => Array.from(tagFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, MAX_TOPICS)
            .map(([tag]) => tag),
        [tagFrequency],
    );

    const hasTopics = topTags.length > 0;
    if (!hasTopics) {
        return null;
    }

    function handleOpen(tag: Tag) {
        openTagView(tag, null);
    }

    return (
        <SidebarSection id="topics" label={t('nav.topics')} railHidden>
            <div className="app-sidebar__topics">
                {topTags.map(tag => {
                    const palette = TagColors.palette(tag);
                    return (
                        <button
                            key={tag}
                            type="button"
                            className="app-sidebar__topic"
                            style={{ background: palette.bg, color: palette.color }}
                            onClick={() => handleOpen(tag)}
                            aria-label={tag}
                        >
                            {tag}
                        </button>
                    );
                })}
            </div>
        </SidebarSection>
    );
}

export function RecentChannelsSection() {
    const { t } = useTranslation();
    const recent = useAppSelector(selectRecentChannels);
    const { subscribedSet } = useSubscription();

    const channels = useMemo(
        () => recent.filter(c => !subscribedSet.has(c.uuid as ChannelId)),
        [recent, subscribedSet],
    );

    const hasChannels = channels.length > 0;
    if (!hasChannels) {
        return null;
    }

    return (
        <SidebarSection id="recent" label={t('nav.recent_channels')} railHidden>
            <ul className="app-sidebar__list">
                {channels.map(ch => {
                    const channelPath = ROUTES.USER.replace(':id', ch.uuid);
                    return (
                        <li key={ch.uuid}>
                            <Tooltip content={ch.name} side="right">
                                <SidebarLink to={channelPath} end={false} aria-label={ch.name}>
                                    <span className="app-sidebar__icon-chip">
                                        <Avatar name={ch.name} size="sm" />
                                    </span>
                                    <span className="app-sidebar__label">{ch.name}</span>
                                </SidebarLink>
                            </Tooltip>
                        </li>
                    );
                })}
            </ul>
        </SidebarSection>
    );
}
