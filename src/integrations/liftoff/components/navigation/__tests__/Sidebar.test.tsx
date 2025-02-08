import { render, screen } from '../../__tests__/setup';
import { Sidebar } from '../Sidebar';
import { NavSection } from '../../../types/navigation';
import { HomeIcon, UsersIcon, SettingsIcon } from 'lucide-react';

// Mock usePathname hook
jest.mock('next/navigation', () => ({
  usePathname: () => '/users',
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
  it('renders all sections and items', () => {
    render(<Sidebar sections={mockSections} />);

    // Check sections
    mockSections.forEach((section) => {
      if (section.title) {
        expect(screen.getByText(section.title)).toBeInTheDocument();
      }

      // Check items in each section
      section.items.forEach((item) => {
        expect(screen.getByText(item.title)).toBeInTheDocument();
      });
    });
  });

  it('applies active state to current path', () => {
    render(<Sidebar sections={mockSections} />);
    const activeLink = screen.getByText('Users').closest('a');
    expect(activeLink).toHaveClass('bg-accent');
  });

  it('renders icons correctly', () => {
    render(<Sidebar sections={mockSections} />);
    const icons = screen.getAllByTestId('nav-item-icon');
    const itemsWithIcons = mockSections.flatMap(
      (section) => section.items.filter((item) => item.icon)
    );
    expect(icons).toHaveLength(itemsWithIcons.length);
  });

  it('handles disabled items correctly', () => {
    render(<Sidebar sections={mockSections} />);
    const disabledLink = screen.getByText('Preferences').closest('a');
    expect(disabledLink).toHaveClass('pointer-events-none', 'opacity-50');
  });

  it('handles external links correctly', () => {
    render(<Sidebar sections={mockSections} />);
    const externalLink = screen.getByText('Documentation').closest('a');
    expect(externalLink).toHaveAttribute('target', '_blank');
    expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByTestId('external-link-icon')).toBeInTheDocument();
  });

  it('renders item labels correctly', () => {
    render(<Sidebar sections={mockSections} />);
    const label = screen.getByText('12');
    expect(label).toHaveClass('text-xs', 'text-muted-foreground');
  });

  it('applies custom className', () => {
    const customClass = 'custom-class';
    render(<Sidebar sections={mockSections} className={customClass} />);
    expect(screen.getByTestId('sidebar-container')).toHaveClass(customClass);
  });

  it('handles sections without title', () => {
    const sectionsWithoutTitle: NavSection[] = [
      {
        items: [{ title: 'Item', href: '/item' }],
      },
    ];
    render(<Sidebar sections={sectionsWithoutTitle} />);
    expect(screen.getByText('Item')).toBeInTheDocument();
  });

  it('maintains consistent spacing and layout', () => {
    render(<Sidebar sections={mockSections} />);
    const sectionsContainer = screen.getByTestId('sections-container');
    expect(sectionsContainer).toHaveClass('space-y-4', 'py-4');
  });
});
