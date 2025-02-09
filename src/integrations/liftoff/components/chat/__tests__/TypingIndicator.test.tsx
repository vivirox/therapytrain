import { render, screen } from '../../__tests__/setup';
import { TypingIndicator } from '../TypingIndicator';

describe('TypingIndicator', () => {
  it('renders without crashing', () => {
    render(<TypingIndicator />);
    expect(screen.getByRole('presentation')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-class';
    render(<TypingIndicator className={customClass} />);
    expect(screen.getByRole('presentation')).toHaveClass(customClass);
  });

  it('renders three dots', () => {
    render(<TypingIndicator />);
    const dots = screen.getAllByRole('presentation');
    expect(dots).toHaveLength(3);
  });

  it('maintains consistent spacing between dots', () => {
    render(<TypingIndicator />);
    const container = screen.getByRole('presentation').parentElement;
    expect(container).toHaveClass('space-x-2');
  });
});
