import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';
import { Button } from "../button";

describe('Button', () => {
    it('renders correctly', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByRole('button')).toHaveTextContent('Click me');
    });

    it('handles click events', async () => {
        const handleClick = vi.fn();
        const user = userEvent.setup();
        render(<Button onClick={handleClick}>Click me</Button>);
        await user.click(screen.getByRole('button'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('supports different variants', () => {
        render(
            <React.Fragment>
                <Button variant="default">Default</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
            </React.Fragment>
        );
        expect(screen.getByText('Default')).toHaveClass('bg-primary');
        expect(screen.getByText('Destructive')).toHaveClass('bg-destructive');
        expect(screen.getByText('Outline')).toHaveClass('border');
    });

    it('supports different sizes', () => {
        render(
            <React.Fragment>
                <Button size="default">Default</Button>
                <Button size="sm">Small</Button>
                <Button size="lg">Large</Button>
            </React.Fragment>
        );
        expect(screen.getByText('Default')).toHaveClass('h-10');
        expect(screen.getByText('Small')).toHaveClass('h-9');
        expect(screen.getByText('Large')).toHaveClass('h-11');
    });

    it('can be disabled', () => {
        render(<Button disabled>Disabled</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });
});
