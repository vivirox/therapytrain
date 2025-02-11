import { render, screen, fireEvent, act } from '../../__tests__/setup';
import { ChatInput } from '../ChatInput';
import userEvent from '@testing-library/user-event';

describe('ChatInput', () => {
  const mockOnSendMessage = jest.fn();

  beforeEach(() => {
    mockOnSendMessage.mockClear();
  });

  it('renders input field and buttons', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /emoji/i })).toBeInTheDocument();
  });

  it('handles text input correctly', async () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Hello');
    expect(input).toHaveValue('Hello');
  });

  it('sends message on button click', async () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    const input = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });

    await userEvent.type(input, 'Hello');
    await userEvent.click(sendButton);

    expect(mockOnSendMessage).toHaveBeenCalledWith('Hello');
    expect(input).toHaveValue('');
  });

  it('sends message on Enter key', async () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    const input = screen.getByRole('textbox');

    await userEvent.type(input, 'Hello{enter}');

    expect(mockOnSendMessage).toHaveBeenCalledWith('Hello');
    expect(input).toHaveValue('');
  });

  it('does not send empty messages', async () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    const sendButton = screen.getByRole('button', { name: /send/i });

    await userEvent.click(sendButton);
    expect(mockOnSendMessage).not.toHaveBeenCalled();

    const input = screen.getByRole('textbox');
    await userEvent.type(input, '   {enter}');
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('handles disabled state correctly', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /emoji/i })).toBeDisabled();
  });

  it('shows custom placeholder text', () => {
    const placeholder = 'Type something...';
    render(
      <ChatInput onSendMessage={mockOnSendMessage} placeholder={placeholder} />
    );
    expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-class';
    render(
      <ChatInput onSendMessage={mockOnSendMessage} className={customClass} />
    );
    expect(screen.getByTestId('chat-input-container')).toHaveClass(customClass);
  });

  // Note: Emoji picker tests would go here, but they require more complex setup
  // due to the external dependency and portal rendering
});
