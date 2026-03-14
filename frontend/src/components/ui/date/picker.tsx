import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { CalendarIcon, X } from 'lucide-react';
import Calendar from './calendar';
import Button from '../button/button';
import './picker.css';

interface DatePickerProps {
    value: string | null
    onChange: (val: string | null) => void
    placeholder?: string
    id?: string
}

function toDate(iso: string | null): Date | undefined {
    const isValid = iso !== null && iso !== '';
    if (!isValid) {
        return undefined;
    }
    return new Date(`${iso}T00:00:00`);
}

function toIso(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatDisplay(iso: string): string {
    return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export default function DatePicker({ value, onChange, placeholder = 'Pick a date', id }: DatePickerProps) {
    const [open, setOpen] = useState(false);
    const hasValue = value !== null && value !== '';

    function handleSelect(day: Date | undefined) {
        if (!day) {
            return;
        }
        onChange(toIso(day));
        setOpen(false);
    }

    function handleClear(e: React.MouseEvent) {
        e.stopPropagation();
        onChange(null);
    }

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="ghost"
                    aria-label={placeholder}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    className={`dp-trigger${hasValue ? '' : ' dp-trigger--empty'}`}
                >
                    <CalendarIcon size={14} className="dp-trigger__icon" />
                    <span className="dp-trigger__text">
                        {hasValue ? formatDisplay(value!) : placeholder}
                    </span>
                    {hasValue && (
                        <X size={12} className="dp-trigger__clear" onClick={handleClear} />
                    )}
                </Button>
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content className="dp-content" align="start" sideOffset={6}>
                    <Calendar
                        mode="single"
                        selected={toDate(value)}
                        onSelect={handleSelect}
                        captionLayout="dropdown"
                        defaultMonth={toDate(value)}
                    />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
