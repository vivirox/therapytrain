import { render, screen } from '../../__tests__/setup';
import { TypingIndicator } from '../TypingIndicator';

describe('TypingIndicator', () => {
  it('renders without crashing', () => {
    render(<TypingIndicator />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Assistant is typing')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-class';
    render(<TypingIndicator className={customClass} />);
    expect(screen.getByRole('status')).toHaveClass(customClass);
  });

  it('renders three dots', () => {
    render(<TypingIndicator />);
    const dots = screen.getAllByTestId('typing-dot');
    expect(dots).toHaveLength(3);
    dots.forEach(dot => {
      expect(dot).toHaveAttribute('aria-hidden', 'true');
      expect(dot).toHaveClass('h-2', 'w-2', 'rounded-full', 'bg-gray-400');
    });
  });

  it('maintains consistent spacing between dots', () => {
    render(<TypingIndicator />);
    const container = screen.getByRole('status');
    expect(container).toHaveClass('space-x-2');
  });
});
