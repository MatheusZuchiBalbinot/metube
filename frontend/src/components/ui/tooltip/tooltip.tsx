import * as RadixTooltip from '@radix-ui/react-tooltip';
import './tooltip.css';

export const TooltipProvider = RadixTooltip.Provider;

interface TooltipProps {
    content: string
    title?: string
    children: React.ReactNode
    side?: 'top' | 'right' | 'bottom' | 'left'
    delayDuration?: number
}

export default function Tooltip({ content, title, children, side = 'top', delayDuration = 400 }: TooltipProps) {
    return (
        <RadixTooltip.Root delayDuration={delayDuration}>
            <RadixTooltip.Trigger asChild>
                {children}
            </RadixTooltip.Trigger>
            <RadixTooltip.Portal>
                <RadixTooltip.Content className="tooltip-content" side={side} sideOffset={6}>
                    {title === undefined
                        ? content
                        : (
                            <span className="tooltip-body">
                                <strong className="tooltip-title">{title}</strong>
                                <span className="tooltip-desc">{content}</span>
                            </span>
                        )}
                    <RadixTooltip.Arrow className="tooltip-arrow" />
                </RadixTooltip.Content>
            </RadixTooltip.Portal>
        </RadixTooltip.Root>
    );
}
