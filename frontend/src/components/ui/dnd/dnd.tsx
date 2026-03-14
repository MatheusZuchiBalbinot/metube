import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CloudUpload, FileVideo, X } from 'lucide-react';
import Button from '../button/button';
import './dnd.css';

interface DragAndDropProps {
    onFileSelect: (file: File) => void
    onClear?: () => void
    accept?: string
    maxSizeMB?: number
    label?: string
    sublabel?: string
}

function formatBytes(bytes: number) {
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildZoneClass(dragging: boolean, file: File | null) {
    return ['dnd-zone', dragging ? 'dnd-zone--dragging' : '', file ? 'dnd-zone--has-file' : '']
        .filter(Boolean)
        .join(' ');
}

export default function DragAndDrop({
    onFileSelect,
    onClear,
    accept = 'video/*',
    maxSizeMB = 500,
    label,
    sublabel,
}: DragAndDropProps) {
    const { t } = useTranslation();
    const [dragging, setDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const resolvedLabel = label ?? t('dnd.drop_file');
    const sub = sublabel ?? t('dnd.drop_file_sub', { maxSizeMB });

    function handleFile(f: File) {
        setError('');
        if (maxSizeMB && f.size > maxSizeMB * 1024 * 1024) {
            setError(t('dnd.file_too_large', { maxSizeMB }));
            return;
        }
        setFile(f);
        onFileSelect(f);
    }

    function handleDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) {
            handleFile(f);
        }
    }

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (f) {
            handleFile(f);
        }
    }

    function clear(e: React.MouseEvent) {
        e.stopPropagation();
        setFile(null);
        setError('');
        if (inputRef.current) {
            inputRef.current.value = '';
        }
        onClear?.();
    }

    const zoneClass = buildZoneClass(dragging, file);

    return (
        <div className="dnd-wrap">
            <div
                className={zoneClass}
                onDragOver={(e) => {
                    e.preventDefault(); setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => !file && inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    className="dnd-input"
                    onChange={handleChange}
                    tabIndex={-1}
                />

                {file ? (
                    <>
                        <div className="dnd-icon dnd-icon--accent">
                            <FileVideo size={22} />
                        </div>
                        <p className="dnd-filename">{file.name}</p>
                        <p className="dnd-filesize">{formatBytes(file.size)}</p>
                        <Button type="button" variant="ghost" size="sm" onClick={clear} className="dnd-clear">
                            <X size={13} />
                            {t('common.remove')}
                        </Button>
                    </>
                ) : (
                    <>
                        <div className={`dnd-icon ${dragging ? 'dnd-icon--accent' : 'dnd-icon--subtle'}`}>
                            <CloudUpload size={22} />
                        </div>
                        <p className="dnd-label">{resolvedLabel}</p>
                        <p className="dnd-sublabel">{sub}</p>
                    </>
                )}
            </div>

            {error && (
                <p className="dnd-error">{error}</p>
            )}
        </div>
    );
}
