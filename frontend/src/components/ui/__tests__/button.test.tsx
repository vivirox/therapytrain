/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Button } from "../button";

describe('Button', () => {
    it('renders correctly', () => {
        const { container } = render(React.createElement(Button, null, 'Click me'));
        const button = container.querySelector('button');
        expect(button).toHaveTextContent('Click me');
    });

    it('handles click events', async () => {
        const handleClick = vi.fn();
        const user = userEvent.setup();
        render(React.createElement(Button, { onClick: handleClick }, 'Click me'));
        await user.click(screen.getByRole('button'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('supports different variants', () => {
        render(React.createElement(React.Fragment, null, [
            React.createElement(Button, { variant: 'default', key: 'default' }, 'Default'),
            React.createElement(Button, { variant: 'destructive', key: 'destructive' }, 'Destructive'),
            React.createElement(Button, { variant: 'outline', key: 'outline' }, 'Outline')
        ]));
        expect(screen.getByText('Default')).toHaveClass('bg-primary');
        expect(screen.getByText('Destructive')).toHaveClass('bg-destructive');
        expect(screen.getByText('Outline')).toHaveClass('border');
    });

    it('supports different sizes', () => {
        render(React.createElement(React.Fragment, null, [
            React.createElement(Button, { size: 'default', key: 'default' }, 'Default'),
            React.createElement(Button, { size: 'sm', key: 'sm' }, 'Small'),
            React.createElement(Button, { size: 'lg', key: 'lg' }, 'Large')
        ]));
        expect(screen.getByText('Default')).toHaveClass('h-10');
        expect(screen.getByText('Small')).toHaveClass('h-9');
        expect(screen.getByText('Large')).toHaveClass('h-11');
    });

    it('can be disabled', () => {
        render(React.createElement(Button, { disabled: true }, 'Disabled'));
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('supports ref forwarding', () => {
        const ref = React.createRef<HTMLButtonElement>();
        render(React.createElement(Button, { ref }, 'Ref Test'));
        expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
});
