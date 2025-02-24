import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatMessage } from '../ChatMessage';
import { ZKChatMessage } from '@/lib/zk/types';

describe('ChatMessage', () => {
  const mockMessage: ZKChatMessage = {
    id: 'msg-1',
    senderId: 'user-1',
    decryptedContent: 'Hello world',
    timestamp: new Date('2024-03-20T10:00:00Z').toISOString(),
    isEncrypted: true,
    replyToId: null,
    attachments: []
  };

  const mockOnEdit = vi.fn();
  const mockOnReply = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render message content correctly', () => {
    render(
      <ChatMessage
        message={mockMessage}
        isOutgoing={true}
        onEdit={mockOnEdit}
        onReply={mockOnReply}
        showThread={false}
      />
    );

    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('10:00 AM')).toBeInTheDocument();
  });

  it('should apply correct styles for outgoing messages', () => {
    const { container } = render(
      <ChatMessage
        message={mockMessage}
        isOutgoing={true}
        onEdit={mockOnEdit}
        onReply={mockOnReply}
        showThread={false}
      />
    );

    const messageContainer = container.firstChild;
    expect(messageContainer).toHaveClass('justify-end');
    expect(messageContainer?.firstChild).toHaveClass('bg-primary');
  });

  it('should apply correct styles for incoming messages', () => {
    const { container } = render(
      <ChatMessage
        message={mockMessage}
        isOutgoing={false}
        onEdit={mockOnEdit}
        onReply={mockOnReply}
        showThread={false}
      />
    );

    const messageContainer = container.firstChild;
    expect(messageContainer).toHaveClass('justify-start');
    expect(messageContainer?.firstChild).toHaveClass('bg-secondary');
  });

  it('should show edit button only for outgoing messages', () => {
    const { rerender } = render(
      <ChatMessage
        message={mockMessage}
        isOutgoing={true}
        onEdit={mockOnEdit}
        onReply={mockOnReply}
        showThread={false}
      />
    );

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();

    rerender(
      <ChatMessage
        message={mockMessage}
        isOutgoing={false}
        onEdit={mockOnEdit}
        onReply={mockOnReply}
        showThread={false}
      />
    );

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('should handle message editing', async () => {
    render(
      <ChatMessage
        message={mockMessage}
        isOutgoing={true}
        onEdit={mockOnEdit}
        onReply={mockOnReply}
        showThread={false}
      />
    );

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    // Edit input should appear with current message
    const input = screen.getByDisplayValue('Hello world');
    fireEvent.change(input, { target: { value: 'Updated message' } });
    
    // Save changes
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(mockOnEdit).toHaveBeenCalledWith('msg-1', 'Updated message');
  });

  it('should handle message replying', () => {
    render(
      <ChatMessage
        message={mockMessage}
        isOutgoing={false}
        onEdit={mockOnEdit}
        onReply={mockOnReply}
        showThread={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /reply/i }));
    expect(mockOnReply).toHaveBeenCalledWith(mockMessage);
  });

  it('should show thread indicator when message has replies', () => {
    const messageWithReplies = {
      ...mockMessage,
      replyCount: 3
    };

    render(
      <ChatMessage
        message={messageWithReplies}
        isOutgoing={true}
        onEdit={mockOnEdit}
        onReply={mockOnReply}
        showThread={true}
      />
    );

    expect(screen.getByText('3 replies')).toBeInTheDocument();
  });

  it('should show replied-to message when message is a reply', () => {
    const replyToMessage = {
      id: 'msg-0',
      senderId: 'user-2',
      decryptedContent: 'Original message',
      timestamp: new Date('2024-03-20T09:55:00Z').toISOString(),
      isEncrypted: true
    };

    const replyMessage = {
      ...mockMessage,
      replyToId: 'msg-0',
      replyTo: replyToMessage
    };

    render(
      <ChatMessage
        message={replyMessage}
        isOutgoing={true}
        onEdit={mockOnEdit}
        onReply={mockOnReply}
        showThread={false}
      />
    );

    expect(screen.getByText('Original message')).toBeInTheDocument();
  });

  it('should handle message with attachments', () => {
    const messageWithAttachments = {
      ...mockMessage,
      attachments: [
        {
          id: 'att-1',
          type: 'image',
          url: 'https://example.com/image.jpg',
          name: 'image.jpg',
          size: 1024
        }
      ]
    };

    render(
      <ChatMessage
        message={messageWithAttachments}
        isOutgoing={true}
        onEdit={mockOnEdit}
        onReply={mockOnReply}
        showThread={false}
      />
    );

    expect(screen.getByAltText('image.jpg')).toBeInTheDocument();
    expect(screen.getByText('1.0 KB')).toBeInTheDocument();
  });

  it('should cancel edit mode when escape is pressed', () => {
    render(
      <ChatMessage
        message={mockMessage}
        isOutgoing={true}
        onEdit={mockOnEdit}
        onReply={mockOnReply}
        showThread={false}
      />
    );

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    
    // Edit input should appear
    const input = screen.getByDisplayValue('Hello world');
    fireEvent.change(input, { target: { value: 'Updated message' } });
    
    // Press escape
    fireEvent.keyDown(input, { key: 'Escape' });

    // Input should disappear and original message should be shown
    expect(screen.queryByDisplayValue('Updated message')).not.toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(mockOnEdit).not.toHaveBeenCalled();
  });

  it('should show encrypted status for encrypted messages', () => {
    render(
      <ChatMessage
        message={mockMessage}
        isOutgoing={true}
        onEdit={mockOnEdit}
        onReply={mockOnReply}
        showThread={false}
      />
    );

    expect(screen.getByTitle('Encrypted message')).toBeInTheDocument();
  });

  it('should handle long messages with proper wrapping', () => {
    const longMessage = {
      ...mockMessage,
      decryptedContent: 'This is a very long message that should wrap properly when it exceeds the container width. It should not overflow or break the layout of the chat interface.'
    };

    const { container } = render(
      <ChatMessage
        message={longMessage}
        isOutgoing={true}
        onEdit={mockOnEdit}
        onReply={mockOnReply}
        showThread={false}
      />
    );

    const messageText = screen.getByText(longMessage.decryptedContent);
    expect(messageText).toHaveStyle({ wordBreak: 'break-word' });
  });
}); 