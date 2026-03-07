import * as React from 'react';
import { DayButton, DayPicker } from 'react-day-picker';

/**
 * Thin DayPicker v9 wrapper that:
 * - Maps class names to the project's dp-cal__* CSS design tokens
 * - Ensures all internal buttons have type="button" so they don't
 *   accidentally submit enclosing forms (React portals still bubble
 *   events through the React component tree)
 */
export default function Calendar({
    components: callerComponents,
    ...props
}: React.ComponentProps<typeof DayPicker>) {
    return (
        <DayPicker
            showOutsideDays
            classNames={{
                root: 'dp-cal',
                months: 'dp-cal__months',
                month: 'dp-cal__month',
                month_caption: 'dp-cal__caption',
                caption_label: 'dp-cal__caption-label',
                dropdowns: 'dp-cal__dropdowns',
                dropdown: 'dp-cal__dropdown',
                dropdown_root: 'dp-cal__dropdown-root',
                months_dropdown: 'dp-cal__dropdown',
                years_dropdown: 'dp-cal__dropdown',
                nav: 'dp-cal__nav',
                button_previous: 'dp-cal__nav-btn',
                button_next: 'dp-cal__nav-btn',
                month_grid: 'dp-cal__grid',
                weekdays: 'dp-cal__weekdays',
                weekday: 'dp-cal__weekday',
                week: 'dp-cal__week',
                day: 'dp-cal__day',
                day_button: 'dp-cal__day-btn',
                selected: 'dp-cal__day--selected',
                today: 'dp-cal__day--today',
                outside: 'dp-cal__day--outside',
                disabled: 'dp-cal__day--disabled',
                hidden: 'dp-cal__day--hidden',
            }}
            components={{
                PreviousMonthButton: ({ children, ...btnProps }) => (
                    <button type="button" {...btnProps}>{children}</button>
                ),
                NextMonthButton: ({ children, ...btnProps }) => (
                    <button type="button" {...btnProps}>{children}</button>
                ),
                DayButton: (dayBtnProps) => <DayButton {...dayBtnProps} type="button" />,
                ...callerComponents,
            }}
            {...props}
        />
    );
}
