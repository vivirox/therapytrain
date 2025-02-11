import { render, screen } from '../../__tests__/setup';
import { MessageBubble } from '../MessageBubble';
import { Message } from '../../../types/chat';

const mockUserMessage: Message = {
  id: '1',
  role: 'user',
  content: 'Hello, world!',
  timestamp: new Date(),
  status: 'sent',
};

const mockAssistantMessage: Message = {
  id: '2',
  role: 'assistant',
  content: 'Hi there!',
  timestamp: new Date(),
};

describe('MessageBubble', () => {
  it('renders user message correctly', () => {
    render(<MessageBubble message={mockUserMessage} />);
    expect(screen.getByText(mockUserMessage.content)).toBeInTheDocument();
    expect(screen.getByRole('article')).toHaveClass('justify-end');
  });

  it('renders assistant message correctly', () => {
    render(<MessageBubble message={mockAssistantMessage} />);
    expect(screen.getByText(mockAssistantMessage.content)).toBeInTheDocument();
    expect(screen.getByRole('article')).toHaveClass('justify-start');
  });

  it('shows typing indicator when isTyping is true', () => {
    render(
      <MessageBubble
        message={{ ...mockAssistantMessage, isTyping: true }}
      />
    );
    expect(screen.getByRole('presentation')).toBeInTheDocument();
  });

  it('shows message status for user messages', () => {
    render(<MessageBubble message={mockUserMessage} />);
    expect(screen.getByTestId('message-status')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-class';
    render(
      <MessageBubble message={mockUserMessage} className={customClass} />
    );
    expect(screen.getByRole('article')).toHaveClass(customClass);
  });

  it('handles messages without status', () => {
    const messageWithoutStatus = { ...mockUserMessage, status: undefined };
    render(<MessageBubble message={messageWithoutStatus} />);
    expect(screen.queryByTestId('message-status')).not.toBeInTheDocument();
  });

  it('handles long messages with proper wrapping', () => {
    const longMessage = {
      ...mockUserMessage,
      content: 'This is a very long message that should wrap to multiple lines.',
    };
    render(<MessageBubble message={longMessage} />);
    expect(screen.getByText(longMessage.content)).toHaveClass('whitespace-pre-wrap', 'break-words');
  });
});
