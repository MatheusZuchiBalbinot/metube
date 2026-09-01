import { Volume1, Volume2, VolumeX } from '@components/icons/icons';

interface VolumeIconProps {
    volume: number
}

export default function VolumeIcon({ volume }: VolumeIconProps) {
    if (volume === 0) {
        return <VolumeX size={20} strokeWidth={1.75} />;
    }

    if (volume < 0.5) {
        return <Volume1 size={20} strokeWidth={1.75} />;
    }

    return <Volume2 size={20} strokeWidth={1.75} />;
}
