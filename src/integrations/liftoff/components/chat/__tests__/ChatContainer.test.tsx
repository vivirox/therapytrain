import { render, screen } from '../../__tests__/setup';
import { ChatContainer } from '../ChatContainer';
import { Message } from '../../../types/chat';
import userEvent from '@testing-library/user-event';

const mockMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'Hello',
    timestamp: new Date(),
    status: 'sent',
  },
  {
    id: '2',
    role: 'assistant',
    content: 'Hi there!',
    timestamp: new Date(),
  },
  {
    id: '3',
    role: 'user',
    content: 'How are you?',
    timestamp: new Date(),
    status: 'delivered',
  },
];

describe('ChatContainer', () => {
  const mockOnSendMessage = jest.fn();

  beforeEach(() => {
    mockOnSendMessage.mockClear();
    // Mock scrollIntoView since it's not implemented in JSDOM
    Element.prototype.scrollIntoView = jest.fn();
  });

  it('renders all messages', () => {
    render(
      <ChatContainer messages={mockMessages} onSendMessage={mockOnSendMessage} />
    );

    mockMessages.forEach((message) => {
      expect(screen.getByText(message.content)).toBeInTheDocument();
    });
  });

  it('shows loading state correctly', () => {
    render(
      <ChatContainer
        messages={mockMessages}
        onSendMessage={mockOnSendMessage}
        isLoading
      />
    );

    expect(screen.getByRole('presentation')).toBeInTheDocument();
  });

  it('handles message sending', async () => {
    render(
      <ChatContainer messages={mockMessages} onSendMessage={mockOnSendMessage} />
    );

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'New message{enter}');

    expect(mockOnSendMessage).toHaveBeenCalledWith('New message');
  });

  it('disables input when loading', () => {
    render(
      <ChatContainer
        messages={mockMessages}
        onSendMessage={mockOnSendMessage}
        isLoading
      />
    );

    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('renders children correctly', () => {
    render(
      <ChatContainer messages={mockMessages} onSendMessage={mockOnSendMessage}>
        <div data-testid="custom-child">Custom Content</div>
      </ChatContainer>
    );

    expect(screen.getByTestId('custom-child')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-class';
    render(
      <ChatContainer
        messages={mockMessages}
        onSendMessage={mockOnSendMessage}
        className={customClass}
      />
    );

    expect(screen.getByTestId('chat-container')).toHaveClass(customClass);
  });

  it('scrolls to bottom when new messages arrive', () => {
    const { rerender } = render(
      <ChatContainer messages={mockMessages} onSendMessage={mockOnSendMessage} />
    );

    rerender(
      <ChatContainer
        messages={[
          ...mockMessages,
          {
            id: '4',
            role: 'assistant' as const,
            content: 'New message',
            timestamp: new Date(),
          },
        ]}
        onSendMessage={mockOnSendMessage}
      />
    );

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('maintains message order', () => {
    render(
      <ChatContainer messages={mockMessages} onSendMessage={mockOnSendMessage} />
    );

    const messageElements = screen.getAllByRole('article');
    expect(messageElements).toHaveLength(mockMessages.length);
    messageElements.forEach((element, index) => {
      expect(element).toHaveTextContent(mockMessages[index].content);
    });
  });
});
