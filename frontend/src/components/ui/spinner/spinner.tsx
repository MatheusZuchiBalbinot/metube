import './spinner.css';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
    size?: SpinnerSize
    fullPage?: boolean
    className?: string
}

export default function Spinner({ size = 'md', fullPage = false, className = '' }: SpinnerProps) {
    const spinner = (
        <div className={`spinner spinner--${size}${className ? ` ${className}` : ''}`} />
    );

    if (fullPage) {
        return <div className="spinner-page">{spinner}</div>;
    }

    return spinner;
}
