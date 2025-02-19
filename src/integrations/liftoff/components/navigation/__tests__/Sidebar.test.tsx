import { render, screen } from '@/test-setup';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Sidebar } from '../Sidebar';
import { NavSection } from '../../../types/navigation';
import { HomeIcon, UsersIcon, SettingsIcon } from 'lucide-react';

// Mock usePathname hook
vi.mock('next/navigation', () => ({
  usePathname: () => '/users',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const mockSections: NavSection[] = [
  {
    title: 'Main',
    items: [
      {
        title: 'Home',
        href: '/',
        icon: HomeIcon,
      },
      {
        title: 'Users',
        href: '/users',
        icon: UsersIcon,
        label: '12',
      },
    ],
  },
  {
    title: 'Settings',
    items: [
      {
        title: 'Preferences',
        href: '/settings',
        icon: SettingsIcon,
        disabled: true,
      },
      {
        title: 'Documentation',
        href: 'https://docs.example.com',
        external: true,
      },
    ],
  },
];

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all sections and items', () => {
    render(<Sidebar sections={mockSections} />);

    // Check sections
    mockSections.forEach((section) => {
      if (section.title) {
        expect(screen.getByText(section.title)).toBeInTheDocument();
      }

      // Check items in each section
      section.items.forEach((item) => {
        const link = screen.getByRole('link', { name: new RegExp(item.title, 'i') });
        expect(link).toBeInTheDocument();
        
        if (item.label) {
          expect(screen.getByText(item.label)).toBeInTheDocument();
        }
      });
    });
  });

  it('applies active state to current path', () => {
    render(<Sidebar sections={mockSections} />);
    const activeLink = screen.getByRole('link', { name: /users/i });
    expect(activeLink).toHaveAttribute('aria-current', 'page');
    expect(activeLink).toHaveClass('bg-accent');
  });

  it('handles disabled items correctly', () => {
    render(<Sidebar sections={mockSections} />);
    const disabledLink = screen.getByRole('link', { name: /preferences/i });
    expect(disabledLink).toHaveAttribute('aria-disabled', 'true');
    expect(disabledLink).toHaveClass('pointer-events-none', 'opacity-50');
  });

  it('handles external links correctly', () => {
    render(<Sidebar sections={mockSections} />);
    const externalLink = screen.getByRole('link', { name: /documentation/i });
    expect(externalLink).toHaveAttribute('target', '_blank');
    expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(externalLink.querySelector('[aria-label="external link"]')).toBeInTheDocument();
  });

  it('renders icons correctly', () => {
    render(<Sidebar sections={mockSections} />);
    const itemsWithIcons = mockSections.flatMap(
      (section) => section.items.filter((item) => item.icon)
    );
    
    itemsWithIcons.forEach((item) => {
      const link = screen.getByRole('link', { name: new RegExp(item.title, 'i') });
      expect(link.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const customClass = 'custom-sidebar';
    render(<Sidebar sections={mockSections} className={customClass} />);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass(customClass);
  });

  it('maintains consistent spacing and layout', () => {
    render(<Sidebar sections={mockSections} />);
    const nav = screen.getByRole('navigation');
    const lists = screen.getAllByRole('list');
    
    expect(nav).toHaveClass('space-y-4');
    lists.forEach(list => {
      expect(list).toHaveClass('space-y-1');
    });
  });

  it('supports keyboard navigation', () => {
    render(<Sidebar sections={mockSections} />);
    const links = screen.getAllByRole('link');
    
    links.forEach(link => {
      expect(link).toHaveAttribute('tabIndex', '0');
      expect(link).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2');
    });
  });

  it('provides proper ARIA attributes', () => {
    render(<Sidebar sections={mockSections} />);
    
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Sidebar navigation');
    
    mockSections.forEach(section => {
      if (section.title) {
        const list = screen.getByRole('list', { name: section.title });
        expect(list).toHaveAttribute('aria-labelledby');
      }
    });
  });
});
