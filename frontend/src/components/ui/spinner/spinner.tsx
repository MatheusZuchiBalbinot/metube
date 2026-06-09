import type { Size } from '../types';
import './spinner.css';

interface SpinnerProps {
    size?: Size
    fullPage?: boolean
    className?: string
}

export default function Spinner({ size = 'md', fullPage = false, className = '' }: SpinnerProps) {
    const spinner = (
        <div role="status" className={`spinner spinner--${size}${className ? ` ${className}` : ''}`} />
    );

    if (fullPage) {
        return <div className="spinner-page">{spinner}</div>;
    }

    return spinner;
}
