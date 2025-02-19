import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@/test-setup';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../breadcrumb';

// Test component
function TestBreadcrumb() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/products">Products</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Current Page</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

describe('Breadcrumb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render breadcrumb structure', () => {
    render(<TestBreadcrumb />);

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3); // 3 items (separators are not list items)
  });

  it('should render links and current page', () => {
    render(<TestBreadcrumb />);

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Products' })).toHaveAttribute('href', '/products');
    expect(screen.getByText('Current Page')).toBeInTheDocument();
  });

  it('should render separators', () => {
    render(<TestBreadcrumb />);

    const separators = screen.getAllByLabelText('separator');
    expect(separators).toHaveLength(2);
    separators.forEach(separator => {
      expect(separator).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('should support custom separator', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>→</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );

    const separator = screen.getByText('→');
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute('aria-hidden', 'true');
  });

  it('should apply correct ARIA attributes', () => {
    render(<TestBreadcrumb />);

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'breadcrumb');

    const currentPage = screen.getByText('Current Page');
    expect(currentPage).toHaveAttribute('aria-current', 'page');
  });

  it('should support custom styling', () => {
    render(
      <Breadcrumb className="custom-nav">
        <BreadcrumbList className="custom-list">
          <BreadcrumbItem className="custom-item">
            <BreadcrumbLink href="/" className="custom-link">Home</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );

    expect(screen.getByRole('navigation')).toHaveClass('custom-nav');
    expect(screen.getByRole('list')).toHaveClass('custom-list');
    expect(screen.getByRole('listitem')).toHaveClass('custom-item');
    expect(screen.getByRole('link')).toHaveClass('custom-link');
  });

  it('should handle responsive layout', () => {
    render(<TestBreadcrumb />);

    const list = screen.getByRole('list');
    expect(list).toHaveClass('flex');
    expect(list).toHaveClass('flex-wrap');
    expect(list).toHaveClass('items-center');
  });

  it('should support truncation for long text', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">
              This is a very long breadcrumb text that should be truncated
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );

    const list = screen.getByRole('list');
    expect(list).toHaveClass('break-words');
  });

  it('should support asChild prop for custom link components', () => {
    const CustomLink = ({ children, ...props }: any) => (
      <a data-testid="custom-link" {...props}>{children}</a>
    );

    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <CustomLink href="/">Home</CustomLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );

    expect(screen.getByTestId('custom-link')).toBeInTheDocument();
  });

  it('should handle hover and focus states', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveClass('hover:text-foreground');
  });

  it('should support keyboard navigation', () => {
    render(<TestBreadcrumb />);

    const links = screen.getAllByRole('link');
    
    // Focus first link
    links[0].focus();
    expect(document.activeElement).toBe(links[0]);

    // Tab to next link
    links[0].blur();
    links[1].focus();
    expect(document.activeElement).toBe(links[1]);
  });
}); 