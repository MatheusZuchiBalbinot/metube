import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { CloudUpload, FileVideo, X } from 'lucide-react'
import './dnd.css'

interface DragAndDropProps {
    onFileSelect: (file: File) => void
    onClear?: () => void
    accept?: string
    maxSizeMB?: number
    label?: string
    sublabel?: string
}

function formatBytes(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DragAndDrop({
    onFileSelect,
    onClear,
    accept = 'video/*',
    maxSizeMB = 500,
    label = 'Arraste um arquivo aqui',
    sublabel,
}: DragAndDropProps) {
    const [dragging, setDragging] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [error, setError] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    const sub = sublabel ?? `ou clique para procurar · max ${maxSizeMB} MB`

    function handleFile(f: File) {
        setError('')
        if (maxSizeMB && f.size > maxSizeMB * 1024 * 1024) {
            setError(`Arquivo muito grande. Máximo: ${maxSizeMB} MB.`)
            return
        }
        setFile(f)
        onFileSelect(f)
    }

    function handleDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files[0]
        if (f) handleFile(f)
    }

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0]
        if (f) handleFile(f)
    }

    function clear(e: React.MouseEvent) {
        e.stopPropagation()
        setFile(null)
        setError('')
        if (inputRef.current) inputRef.current.value = ''
        onClear?.()
    }

    const zoneClass = [
        'dnd-zone',
        dragging ? 'dnd-zone--dragging' : '',
        file ? 'dnd-zone--has-file' : '',
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <div className="dnd-wrap">
            <div
                className={zoneClass}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
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
                        <button type="button" onClick={clear} className="dnd-clear">
                            <X size={13} />
                            Remover
                        </button>
                    </>
                ) : (
                    <>
                        <div className={`dnd-icon ${dragging ? 'dnd-icon--accent' : 'dnd-icon--subtle'}`}>
                            <CloudUpload size={22} />
                        </div>
                        <p className="dnd-label">{label}</p>
                        <p className="dnd-sublabel">{sub}</p>
                    </>
                )}
            </div>

            {error && (
                <p className="dnd-error">{error}</p>
            )}
        </div>
    )
}
