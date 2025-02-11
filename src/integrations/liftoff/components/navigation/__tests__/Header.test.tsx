import { render, screen } from '../../__tests__/setup';
import { Header } from '../Header';

describe('Header', () => {
  const mockTitle = 'Dashboard';
  const mockDescription = 'Welcome to your dashboard';

  it('renders title correctly', () => {
    render(<Header title={mockTitle} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(mockTitle);
  });

  it('renders description correctly', () => {
    render(<Header description={mockDescription} />);
    expect(screen.getByText(mockDescription)).toBeInTheDocument();
  });

  it('renders actions correctly', () => {
    const mockActions = (
      <button data-testid="mock-action">Action</button>
    );
    render(<Header actions={mockActions} />);
    expect(screen.getByTestId('mock-action')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-class';
    render(<Header className={customClass} />);
    expect(screen.getByTestId('header-container')).toHaveClass(customClass);
  });

  it('renders without title and description', () => {
    render(<Header />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('header-description')).not.toBeInTheDocument();
  });

  it('renders with all props', () => {
    const mockActions = (
      <button data-testid="mock-action">Action</button>
    );
    render(
      <Header
        title={mockTitle}
        description={mockDescription}
        actions={mockActions}
      />
    );

    expect(screen.getByRole('heading')).toHaveTextContent(mockTitle);
    expect(screen.getByText(mockDescription)).toBeInTheDocument();
    expect(screen.getByTestId('mock-action')).toBeInTheDocument();
  });

  it('maintains correct layout on mobile', () => {
    render(
      <Header
        title={mockTitle}
        description={mockDescription}
        actions={<button>Action</button>}
      />
    );

    const container = screen.getByTestId('header-container');
    expect(container).toHaveClass('flex-col', 'md:flex-row');
  });

  it('maintains correct spacing between elements', () => {
    render(
      <Header
        title={mockTitle}
        description={mockDescription}
      />
    );

    const titleContainer = screen.getByTestId('header-content');
    expect(titleContainer).toHaveClass('space-y-1.5');
  });
});
