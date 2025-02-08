import { render, screen, fireEvent } from '../../__tests__/setup';
import { MobileMenu } from '../MobileMenu';
import { NavSection } from '../../../types/navigation';
import { HomeIcon, UsersIcon } from 'lucide-react';
import userEvent from '@testing-library/user-event';

// Mock usePathname hook
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
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
      },
    ],
  },
];

describe('MobileMenu', () => {
  it('renders toggle button', () => {
    render(<MobileMenu sections={mockSections} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByLabelText(/toggle menu/i)).toBeInTheDocument();
  });

  it('shows menu when clicked', async () => {
    render(<MobileMenu sections={mockSections} />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders sidebar content when open', async () => {
    render(<MobileMenu sections={mockSections} />);
    await userEvent.click(screen.getByRole('button'));

    // Check if sidebar content is rendered
    mockSections.forEach((section) => {
      if (section.title) {
        expect(screen.getByText(section.title)).toBeInTheDocument();
      }
      section.items.forEach((item) => {
        expect(screen.getByText(item.title)).toBeInTheDocument();
      });
    });
  });

  it('closes when clicking outside', async () => {
    render(<MobileMenu sections={mockSections} />);
    
    // Open menu
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click outside (on the overlay)
    fireEvent.click(document.body);
    
    // Check if dialog is removed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('applies custom className to toggle button', () => {
    const customClass = 'custom-class';
    render(<MobileMenu sections={mockSections} className={customClass} />);
    expect(screen.getByRole('button')).toHaveClass(customClass);
  });

  it('is hidden on desktop', () => {
    render(<MobileMenu sections={mockSections} />);
    expect(screen.getByRole('button')).toHaveClass('md:hidden');
  });

  it('maintains correct sheet dimensions', async () => {
    render(<MobileMenu sections={mockSections} />);
    await userEvent.click(screen.getByRole('button'));
    
    const sheet = screen.getByTestId('mobile-menu-sheet');
    expect(sheet).toHaveClass('w-[80vw]', 'sm:max-w-[350px]');
  });

  it('renders sidebar without borders', async () => {
    render(<MobileMenu sections={mockSections} />);
    await userEvent.click(screen.getByRole('button'));
    
    const sidebar = screen.getByTestId('sidebar-container');
    expect(sidebar).toHaveClass('border-none');
  });

  it('maintains menu button accessibility', () => {
    render(<MobileMenu sections={mockSections} />);
    const button = screen.getByRole('button');
    
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.getByLabelText(/toggle menu/i)).toBeInTheDocument();
  });
});
