import './skeleton.css';

interface SkeletonProps {
    className?: string
    width?: string | number
    height?: string | number
    circle?: boolean
}

export default function Skeleton({ className = '', width, height, circle = false }: SkeletonProps) {
    const classes = ['skeleton', circle ? 'skeleton--circle' : '', className]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={classes}
            style={{ width, height }}
            aria-hidden="true"
        />
    );
}
