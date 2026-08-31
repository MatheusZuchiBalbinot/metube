import { Check } from 'lucide-react';
import { cn } from '@utils';

export interface ToggleRowProps {
    icon: React.ReactNode
    label: string
    active: boolean
    onClick: () => void
}

/** A single on/off row in the settings menu (Autoplay, Loop, AB-repeat, Ambient). */
export default function ToggleRow({ icon, label, active, onClick }: ToggleRowProps) {
    return (
        <button
            className={cn('vp__settings-option', active && 'vp__settings-option--active')}
            onClick={onClick}
            role="switch"
            aria-checked={active}
        >
            <span className="vp__settings-loop-label">
                {icon}
                {label}
            </span>
            {active && <Check size={12} />}
        </button>
    );
}
