import { Fragment } from 'react';
import { parseTimestamp } from '@utils';
import './text.css';

// Matches m:ss or h:mm:ss without latching onto longer digit runs.
const TIMESTAMP_RE = /(?<!\d)(\d{1,2}:\d{2}(?::\d{2})?)(?!\d)/g;

interface TimestampedTextProps {
    text: string;
    onSeek?: (seconds: number) => void;
}

/**
 * Renders text with `m:ss` / `h:mm:ss` timestamps turned into buttons that seek
 * the player. Without `onSeek` (e.g. outside the watch page) it renders plain text.
 */
export default function TimestampedText({ text, onSeek }: TimestampedTextProps) {
    if (onSeek === undefined) {
        return <>{text}</>;
    }

    const parts = text.split(TIMESTAMP_RE);

    return (
        <>
            {parts.map((part, index) => {
                const isTimestamp = index % 2 === 1;

                if (!isTimestamp) {
                    return <Fragment key={index}>{part}</Fragment>;
                }

                return (
                    <button
                        key={index}
                        type="button"
                        className="ts-link"
                        onClick={() => onSeek(parseTimestamp(part))}
                    >
                        {part}
                    </button>
                );
            })}
        </>
    );
}
