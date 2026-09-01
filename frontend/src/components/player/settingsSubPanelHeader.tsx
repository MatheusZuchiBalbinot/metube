import { ChevronLeft } from '@components/icons/icons';

interface SubPanelHeaderProps {
    title: string
    onBack: () => void
}

/** Header shared by every drill-down submenu: back arrow + the setting's name. */
export default function SubPanelHeader({ title, onBack }: SubPanelHeaderProps) {
    return (
        <button className="vp__settings-header" onClick={onBack}>
            <ChevronLeft size={16} />
            <span>{title}</span>
        </button>
    );
}
