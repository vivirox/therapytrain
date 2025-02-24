import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test-setup';
import userEvent from '@testing-library/user-event';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from '../navigation-menu';

// Test component
function TestNavigationMenu() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem index={0}>
          <NavigationMenuTrigger>Item 1</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="/link1">Link 1</NavigationMenuLink>
            <NavigationMenuLink href="/link2">Link 2</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem index={1}>
          <NavigationMenuTrigger>Item 2</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="/link3">Link 3</NavigationMenuLink>
            <NavigationMenuLink href="/link4">Link 4</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

describe('Navigation Menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render navigation menu structure', () => {
    render(<TestNavigationMenu />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('should show content when trigger is clicked', async () => {
    render(<TestNavigationMenu />);

    const trigger = screen.getByText('Item 1');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Link 1')).toBeVisible();
      expect(screen.getByText('Link 2')).toBeVisible();
    });
  });

  it('should handle keyboard navigation', async () => {
    render(<TestNavigationMenu />);

    // Test Alt+1 shortcut
    fireEvent.keyDown(document, { key: '1', altKey: true });
    expect(document.activeElement).toHaveAttribute('data-nav-item', '0');

    // Test arrow navigation
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight', altKey: true });
    expect(document.activeElement).toHaveAttribute('data-nav-item', '1');

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft', altKey: true });
    expect(document.activeElement).toHaveAttribute('data-nav-item', '0');
  });

  it('should support focus management', () => {
    render(<TestNavigationMenu />);

    const trigger1 = screen.getByText('Item 1');
    const trigger2 = screen.getByText('Item 2');

    // Test focus order
    trigger1.focus();
    expect(document.activeElement).toBe(trigger1);

    fireEvent.keyDown(trigger1, { key: 'Tab' });
    expect(document.activeElement).toBe(trigger2);
  });

  it('should handle content animations', async () => {
    render(<TestNavigationMenu />);

    const trigger = screen.getByText('Item 1');
    fireEvent.click(trigger);

    const content = await screen.findByRole('group');
    expect(content).toHaveClass('data-[motion^=from-]:animate-in');
    expect(content).toHaveClass('data-[motion^=to-]:animate-out');
  });

  it('should support high contrast mode', () => {
    render(<TestNavigationMenu />);

    const menu = screen.getByRole('navigation');
    expect(menu).toHaveClass('focus-visible-within');

    const items = screen.getAllByRole('menuitem');
    items.forEach(item => {
      expect(item).toHaveClass('focus-visible-ring');
    });
  });

  it('should handle reduced motion preferences', () => {
    // Mock matchMedia for reduced motion
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));

    render(<TestNavigationMenu />);

    const content = screen.getByRole('group');
    expect(content).toHaveClass('reduced-motion-safe');
  });

  it('should support nested navigation', async () => {
    render(<TestNavigationMenu />);

    // Open first menu
    const trigger1 = screen.getByText('Item 1');
    fireEvent.click(trigger1);

    // Wait for content
    await waitFor(() => {
      expect(screen.getByText('Link 1')).toBeVisible();
    });

    // Open second menu
    const trigger2 = screen.getByText('Item 2');
    fireEvent.click(trigger2);

    // First menu should close, second menu should open
    await waitFor(() => {
      expect(screen.queryByText('Link 1')).not.toBeVisible();
      expect(screen.getByText('Link 3')).toBeVisible();
    });
  });

  it('should handle viewport resizing', async () => {
    render(<TestNavigationMenu />);

    const trigger = screen.getByText('Item 1');
    fireEvent.click(trigger);

    const viewport = screen.getByRole('group');
    expect(viewport).toHaveStyle({
      '--radix-navigation-menu-viewport-width': expect.any(String),
      '--radix-navigation-menu-viewport-height': expect.any(String),
    });
  });
}); 