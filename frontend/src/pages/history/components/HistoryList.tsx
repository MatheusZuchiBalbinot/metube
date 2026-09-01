import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from '@components/icons/icons';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import VideoRow from '@components/video/row';
import { Button, Tooltip } from '@ui';
import { cn } from '@utils';
import { HistoryItemKind } from '@enums/historyItemKind';
import { useMediaQuery } from '@hooks';
import type { Video, VideoId } from '@models';

// Estimated heights for virtualizer — group headers are shorter than rows.
const GROUP_HEADER_HEIGHT = 36;
const VIDEO_ROW_HEIGHT = 136;

export type FlatItem =
    | { type: typeof HistoryItemKind.HEADER; label: string }
    | { type: typeof HistoryItemKind.VIDEO; id: string };

interface Props {
    flatItems: FlatItem[]
    videoMap: Map<VideoId, Video>
    onRemove: (id: VideoId) => void
}

export default function HistoryList({ flatItems, videoMap, onRemove }: Props) {
    const { t } = useTranslation();
    const isTouchDevice = useMediaQuery('(hover: none)');
    const listRef = useRef<HTMLDivElement>(null);

    /* eslint-disable react-hooks/refs */
    const virtualizer = useWindowVirtualizer({
        count: flatItems.length,
        estimateSize: (i) => {
            const item = flatItems[i];
            return item?.type === HistoryItemKind.HEADER ? GROUP_HEADER_HEIGHT : VIDEO_ROW_HEIGHT;
        },
        overscan: 5,
        scrollMargin: listRef.current?.offsetTop ?? 0,
    });
    /* eslint-enable react-hooks/refs */

    return (
        <div className="history-page__content" ref={listRef}>
            <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
                {virtualizer.getVirtualItems().map(virtualItem => {
                    const item = flatItems[virtualItem.index];
                    return (
                        <div
                            key={virtualItem.key}
                            data-index={virtualItem.index}
                            ref={virtualizer.measureElement}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)`,
                            }}
                        >
                            {item.type === HistoryItemKind.HEADER ? (
                                <h2 className="history-page__group-label">{item.label}</h2>
                            ) : (
                                <div className="history-page__item">
                                    <VideoRow video={videoMap.get(item.id as VideoId)!} />
                                    <Tooltip content={t('history.remove')} side="left">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn('history-page__remove-btn', isTouchDevice && 'history-page__remove-btn--touch')}
                                            onClick={() => onRemove(item.id as VideoId)}
                                            aria-label={t('history.remove')}
                                        >
                                            <X size={14} strokeWidth={2} />
                                        </Button>
                                    </Tooltip>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
