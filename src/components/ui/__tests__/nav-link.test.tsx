import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NavLink } from '../nav-link';
import { useFocusVisible } from '@/hooks/use-focus-visible';
import { usePathname } from 'next/navigation';

// Mock hooks
vi.mock('@/hooks/use-focus-visible', () => ({
  useFocusVisible: vi.fn(() => ({
    isFocusVisible: true,
    focusProps: {
      onFocus: vi.fn(),
      onBlur: vi.fn(),
    },
  })),
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => (
    <a {...props}>{children}</a>
  ),
}));

describe('NavLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render link with correct href', () => {
    (usePathname as jest.Mock).mockReturnValue('/other-page');

    render(
      <NavLink href="/test-page">Test Link</NavLink>
    );

    const link = screen.getByRole('link', { name: 'Test Link' });
    expect(link).toHaveAttribute('href', '/test-page');
  });

  it('should apply active styles when current path matches href', () => {
    (usePathname as jest.Mock).mockReturnValue('/test-page');

    const { container } = render(
      <NavLink href="/test-page">Test Link</NavLink>
    );

    // NavFocusRing should have active prop
    const focusRing = container.firstChild;
    expect(focusRing).toHaveAttribute('data-active', 'true');
  });

  it('should not apply active styles when current path differs', () => {
    (usePathname as jest.Mock).mockReturnValue('/other-page');

    const { container } = render(
      <NavLink href="/test-page">Test Link</NavLink>
    );

    // NavFocusRing should not have active prop
    const focusRing = container.firstChild;
    expect(focusRing).not.toHaveAttribute('data-active', 'true');
  });

  it('should handle focus states correctly', () => {
    (usePathname as jest.Mock).mockReturnValue('/other-page');

    render(
      <NavLink href="/test-page">Test Link</NavLink>
    );

    const link = screen.getByRole('link', { name: 'Test Link' });

    // Focus the link
    fireEvent.focus(link);
    expect(link).toHaveClass('focus-visible:outline-none');

    // Blur the link
    fireEvent.blur(link);
    expect(link).not.toHaveClass('focus-visible:ring');
  });

  it('should support custom className', () => {
    (usePathname as jest.Mock).mockReturnValue('/other-page');

    render(
      <NavLink href="/test-page" className="custom-class">
        Test Link
      </NavLink>
    );

    const link = screen.getByRole('link', { name: 'Test Link' });
    expect(link).toHaveClass('custom-class');
  });

  it('should handle disabled state', () => {
    (usePathname as jest.Mock).mockReturnValue('/other-page');

    render(
      <NavLink href="/test-page" aria-disabled="true">
        Test Link
      </NavLink>
    );

    const link = screen.getByRole('link', { name: 'Test Link' });
    expect(link).toHaveClass('disabled:pointer-events-none');
    expect(link).toHaveClass('disabled:opacity-50');
  });

  it('should support keyboard navigation', () => {
    (usePathname as jest.Mock).mockReturnValue('/other-page');

    render(
      <>
        <NavLink href="/page-1">Link 1</NavLink>
        <NavLink href="/page-2">Link 2</NavLink>
      </>
    );

    const link1 = screen.getByRole('link', { name: 'Link 1' });
    const link2 = screen.getByRole('link', { name: 'Link 2' });

    // Focus first link
    link1.focus();
    expect(document.activeElement).toBe(link1);

    // Tab to next link
    fireEvent.keyDown(link1, { key: 'Tab' });
    expect(document.activeElement).toBe(link2);
  });

  it('should handle focus visible state from hook', () => {
    (useFocusVisible as jest.Mock).mockReturnValue({
      isFocusVisible: true,
      focusProps: {
        onFocus: vi.fn(),
        onBlur: vi.fn(),
      },
    });

    render(
      <NavLink href="/test-page">Test Link</NavLink>
    );

    const link = screen.getByRole('link', { name: 'Test Link' });
    expect(link).toHaveClass('focus-visible:outline-none');
  });

  it('should support external links', () => {
    (usePathname as jest.Mock).mockReturnValue('/other-page');

    render(
      <NavLink href="https://example.com" target="_blank" rel="noopener noreferrer">
        External Link
      </NavLink>
    );

    const link = screen.getByRole('link', { name: 'External Link' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should handle click events', () => {
    (usePathname as jest.Mock).mockReturnValue('/other-page');
    const handleClick = vi.fn();

    render(
      <NavLink href="/test-page" onClick={handleClick}>
        Test Link
      </NavLink>
    );

    const link = screen.getByRole('link', { name: 'Test Link' });
    fireEvent.click(link);

    expect(handleClick).toHaveBeenCalled();
  });

  it('should support ref forwarding', () => {
    (usePathname as jest.Mock).mockReturnValue('/other-page');
    const ref = { current: null };

    render(
      <NavLink href="/test-page" ref={ref}>
        Test Link
      </NavLink>
    );

    expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
  });
}); 