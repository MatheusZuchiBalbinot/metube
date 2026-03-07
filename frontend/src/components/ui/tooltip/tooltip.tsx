import * as RadixTooltip from '@radix-ui/react-tooltip';
import './tooltip.css';

export const TooltipProvider = RadixTooltip.Provider;

interface TooltipProps {
    content: string
    children: React.ReactNode
    side?: 'top' | 'right' | 'bottom' | 'left'
    delayDuration?: number
}

export default function Tooltip({ content, children, side = 'top', delayDuration = 400 }: TooltipProps) {
    return (
        <RadixTooltip.Root delayDuration={delayDuration}>
            <RadixTooltip.Trigger asChild>
                {children}
            </RadixTooltip.Trigger>
            <RadixTooltip.Portal>
                <RadixTooltip.Content className="tooltip-content" side={side} sideOffset={6}>
                    {content}
                    <RadixTooltip.Arrow className="tooltip-arrow" />
                </RadixTooltip.Content>
            </RadixTooltip.Portal>
        </RadixTooltip.Root>
    );
}
