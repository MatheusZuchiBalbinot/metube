import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import './modal.css'

type ModalSize = 'sm' | 'md' | 'lg'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
    footer?: React.ReactNode
    size?: ModalSize
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
}: ModalProps) {
    useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [isOpen, onClose])

    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    if (!isOpen) return null

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={`modal-box modal-box--${size}`}
                onClick={(e) => e.stopPropagation()}
            >
                {title && (
                    <div className="modal-header">
                        <h2>{title}</h2>
                        <button
                            className="modal-close"
                            onClick={onClose}
                            aria-label="Fechar"
                        >
                            <X size={13} strokeWidth={2.5} />
                        </button>
                    </div>
                )}

                <div className="modal-body">{children}</div>

                {footer && (
                    <div className="modal-footer">{footer}</div>
                )}
            </div>
        </div>,
        document.body,
    )
}
