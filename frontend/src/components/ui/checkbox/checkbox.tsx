import { Check } from 'lucide-react';
import { cn } from '@utils';
import './checkbox.css';

interface CheckboxProps {
    checked: boolean
    onChange: (checked: boolean) => void
    disabled?: boolean
    className?: string
}

export default function Checkbox({ checked, onChange, disabled, className = '' }: CheckboxProps) {
    const classes = cn('checkbox', className);

    return (
        <span className={classes}>
            <input
                type="checkbox"
                className="checkbox__input"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                disabled={disabled}
            />
            <span className="checkbox__box" aria-hidden="true">
                {checked && <Check size={10} strokeWidth={2.5} />}
            </span>
        </span>
    );
}
