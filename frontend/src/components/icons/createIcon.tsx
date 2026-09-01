import { forwardRef, createElement } from 'react';
import type { SVGProps, ForwardRefExoticComponent, RefAttributes, ReactNode } from 'react';

type IconNode = [tag: string, attrs: Record<string, string | number>][];

export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    absoluteStrokeWidth?: boolean;
}

export type LucideIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

const defaultAttributes = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

export default function createIcon(name: string, iconNode: IconNode): ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>> {
    const Component = forwardRef<SVGSVGElement, IconProps>(function IconComponent(props, ref) {
        const { color, size, strokeWidth, absoluteStrokeWidth, className = '', children, ...rest } = props;

        const calculatedStrokeWidth = absoluteStrokeWidth
            ? (Number(strokeWidth ?? defaultAttributes.strokeWidth) * 24) / Number(size ?? defaultAttributes.width)
            : (strokeWidth ?? defaultAttributes.strokeWidth);

        return createElement(
            'svg',
            {
                ref,
                ...defaultAttributes,
                width: size ?? defaultAttributes.width,
                height: size ?? defaultAttributes.height,
                stroke: color ?? defaultAttributes.stroke,
                strokeWidth: calculatedStrokeWidth,
                className: ['icon', className].filter(Boolean).join(' '),
                ...(!children && { 'aria-hidden': 'true' }),
                ...rest,
            },
            [
                ...iconNode.map(([tag, attrs]) => createElement(tag, attrs)),
                ...(Array.isArray(children) ? children : [children as ReactNode]),
            ],
        );
    });

    Component.displayName = name;

    return Component;
}
