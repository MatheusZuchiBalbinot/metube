import { ChevronRight } from '@components/icons/icons';

interface DrillDownRowProps {
    icon: React.ReactNode
    label: string
    value: string
    onClick: () => void
}

/**
 * Root-menu row that drills into a submenu, YouTube settings-gear style: icon,
 * label, the currently-applied value, and a chevron — click swaps the whole
 * panel to that setting's option list instead of expanding inline.
 */
export default function DrillDownRow({ icon, label, value, onClick }: DrillDownRowProps) {
    return (
        <button className="vp__settings-row" onClick={onClick}>
            <span className="vp__settings-loop-label">
                {icon}
                {label}
            </span>
            <span className="vp__settings-row-right">
                <span className="vp__settings-row-value">{value}</span>
                <ChevronRight size={14} />
            </span>
        </button>
    );
}
