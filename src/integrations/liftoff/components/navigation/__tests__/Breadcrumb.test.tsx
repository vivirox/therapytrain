import { render, screen } from '../../__tests__/setup';
import { Breadcrumb } from '../Breadcrumb';
import { BreadcrumbItem } from '../../../types/navigation';

const mockItems: BreadcrumbItem[] = [
  { title: 'Home', href: '/' },
  { title: 'Users', href: '/users' },
  { title: 'Settings' },
];

describe('Breadcrumb', () => {
  it('renders all items', () => {
    render(<Breadcrumb items={mockItems} />);
    mockItems.forEach((item) => {
      expect(screen.getByText(item.title)).toBeInTheDocument();
    });
  });

  it('renders correct number of separators', () => {
    render(<Breadcrumb items={mockItems} />);
    const separators = screen.getAllByTestId('breadcrumb-separator');
    expect(separators).toHaveLength(mockItems.length - 1);
  });

  it('renders links for items with href', () => {
    render(<Breadcrumb items={mockItems} />);
    const links = screen.getAllByRole('link');
    const itemsWithHref = mockItems.filter((item) => item.href);
    expect(links).toHaveLength(itemsWithHref.length);
  });

  it('renders last item as text', () => {
    render(<Breadcrumb items={mockItems} />);
    const lastItem = screen.getByText(mockItems[mockItems.length - 1].title);
    expect(lastItem.tagName).toBe('SPAN');
    expect(lastItem).toHaveClass('font-medium', 'text-foreground');
  });

  it('applies custom className', () => {
    const customClass = 'custom-class';
    render(<Breadcrumb items={mockItems} className={customClass} />);
    expect(screen.getByRole('navigation')).toHaveClass(customClass);
  });

  it('renders correctly with single item', () => {
    const singleItem = [{ title: 'Home' }];
    render(<Breadcrumb items={singleItem} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.queryByTestId('breadcrumb-separator')).not.toBeInTheDocument();
  });

  it('handles empty items array', () => {
    render(<Breadcrumb items={[]} />);
    expect(screen.getByRole('navigation')).toBeEmptyDOMElement();
  });

  it('adds correct aria labels', () => {
    render(<Breadcrumb items={mockItems} />);
    expect(screen.getByRole('navigation')).toHaveAttribute(
      'aria-label',
      'Breadcrumb'
    );
  });
});
