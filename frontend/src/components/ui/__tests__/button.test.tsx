/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Button } from "../button";
import { vi } from 'vitest';

describe('Button', () => {
    it('renders correctly', () => {
        const { container } = render(<Button>Click me</Button>);
        expect(container.querySelector('button')).toBeInTheDocument();
    });

    it('supports different variants', () => {
        const { container } = render(
            <div>
                <Button variant="default">Default</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
            </div>
        );

        const defaultButton = container.querySelector('button:nth-child(1)');
        const destructiveButton = container.querySelector('button:nth-child(2)');
        const outlineButton = container.querySelector('button:nth-child(3)');

        expect(defaultButton).toHaveClass('bg-primary');
        expect(destructiveButton).toHaveClass('bg-destructive');
        expect(outlineButton).toHaveClass('border-input');
    });

    it('supports different sizes', () => {
        const { container } = render(
            <div>
                <Button size="default">Default</Button>
                <Button size="sm">Small</Button>
                <Button size="lg">Large</Button>
            </div>
        );
        
        const defaultButton = container.querySelector('button:nth-child(1)');
        const smallButton = container.querySelector('button:nth-child(2)');
        const largeButton = container.querySelector('button:nth-child(3)');
        
        expect(defaultButton).toHaveClass('h-10');
        expect(smallButton).toHaveClass('h-9');
        expect(largeButton).toHaveClass('h-11');
    });

    it('handles click events', async () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click me</Button>);
        
        await userEvent.click(screen.getByText('Click me'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('can be disabled', () => {
        render(<Button disabled>Disabled</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('supports ref forwarding', () => {
        const ref = React.createRef<HTMLButtonElement>();
        render(<Button ref={ref}>Ref Test</Button>);
        expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
});
