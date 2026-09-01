// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Dropdown from '@ui/dropdown/dropdown';
import type { DropdownOption } from '@ui/dropdown/dropdown';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

const options: DropdownOption[] = [
    { label: 'Option A', value: 'a' },
    { label: 'Option B', value: 'b' },
    { label: 'Option C', value: 'c' },
];

function renderDropdown(props: Partial<React.ComponentProps<typeof Dropdown>> = {}) {
    return render(
        <MemoryRouter>
            <Dropdown options={options} onChange={() => undefined} {...props} />
        </MemoryRouter>,
    );
}

describe('Dropdown', () => {
    it('renders the placeholder when no value is selected', () => {
        renderDropdown({ placeholder: 'Choose...' });
        expect(screen.getByText('Choose...')).toBeInTheDocument();
    });

    it('renders selected option label', () => {
        renderDropdown({ value: 'b' });
        expect(screen.getByText('Option B')).toBeInTheDocument();
    });

    it('opens the option list when trigger is clicked', async () => {
        renderDropdown();
        const trigger = screen.getByRole('button');
        await userEvent.click(trigger);
        expect(screen.getByText('Option A')).toBeInTheDocument();
        expect(screen.getByText('Option B')).toBeInTheDocument();
    });

    it('calls onChange with selected value', async () => {
        const onChange = vi.fn();
        renderDropdown({ onChange });
        await userEvent.click(screen.getByRole('button'));
        await userEvent.click(screen.getByText('Option A'));
        expect(onChange).toHaveBeenCalledWith('a');
    });

    it('closes dropdown after selecting an option', async () => {
        renderDropdown();
        const trigger = screen.getByRole('button');
        await userEvent.click(trigger);
        await userEvent.click(screen.getByText('Option A'));

        // The trigger reflects the closed state immediately; the menu itself lingers
        // mounted (with a closing class) to play its exit animation before unmounting —
        // see Dropdown's shouldRenderMenu/isMenuClosing for why.
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(document.querySelector('.dropdown-menu--closing')).toBeInTheDocument();
    });

    it('renders label when provided', () => {
        renderDropdown({ label: 'My Label' });
        expect(screen.getByText('My Label')).toBeInTheDocument();
    });

    it('applies disabled class when disabled=true', () => {
        renderDropdown({ disabled: true });
        const trigger = screen.getByRole('button');
        expect(trigger).toHaveClass('dropdown-trigger--disabled');
    });

    it('sets aria-haspopup and aria-controls pointing at the menu on the trigger', async () => {
        renderDropdown();
        const trigger = screen.getByRole('button');
        expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');

        await userEvent.click(trigger);
        const menuId = trigger.getAttribute('aria-controls');
        expect(menuId).toBeTruthy();
        expect(document.getElementById(menuId as string)).toHaveAttribute('role', 'listbox');
    });

    it('moves roving focus onto the selected option when opened', async () => {
        renderDropdown({ value: 'b' });
        await userEvent.click(screen.getByRole('button'));
        expect(screen.getByRole('option', { name: 'Option B' })).toHaveFocus();
    });

    it('navigates options with ArrowDown/ArrowUp, wrapping at the ends', async () => {
        renderDropdown();
        await userEvent.click(screen.getByRole('button'));
        expect(screen.getByRole('option', { name: 'Option A' })).toHaveFocus();

        await userEvent.keyboard('{ArrowDown}');
        expect(screen.getByRole('option', { name: 'Option B' })).toHaveFocus();

        await userEvent.keyboard('{ArrowUp}{ArrowUp}');
        expect(screen.getByRole('option', { name: 'Option C' })).toHaveFocus();
    });

    it('jumps to first/last option with Home/End', async () => {
        renderDropdown();
        await userEvent.click(screen.getByRole('button'));

        await userEvent.keyboard('{End}');
        expect(screen.getByRole('option', { name: 'Option C' })).toHaveFocus();

        await userEvent.keyboard('{Home}');
        expect(screen.getByRole('option', { name: 'Option A' })).toHaveFocus();
    });

    it('closes on Escape and returns focus to the trigger', async () => {
        renderDropdown();
        const trigger = screen.getByRole('button');
        await userEvent.click(trigger);

        await userEvent.keyboard('{Escape}');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(trigger).toHaveFocus();
    });
});
