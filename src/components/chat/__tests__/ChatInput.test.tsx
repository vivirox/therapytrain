import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from '../ChatInput';
import { ZKChatMessage } from '@/lib/zk/types';

describe('ChatInput', () => {
  const mockOnSend = vi.fn();
  const mockOnCancelReply = vi.fn();
  const mockOnAttachmentAdd = vi.fn();
  const mockOnAttachmentRemove = vi.fn();

  const mockReplyToMessage: ZKChatMessage = {
    id: 'msg-1',
    senderId: 'user-1',
    decryptedContent: 'Original message',
    timestamp: new Date().toISOString(),
    isEncrypted: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render input field and send button', () => {
    render(
      <ChatInput
        onSend={mockOnSend}
        disabled={false}
      />
    );

    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('should handle message sending', async () => {
    render(
      <ChatInput
        onSend={mockOnSend}
        disabled={false}
      />
    );

    const input = screen.getByPlaceholderText(/type a message/i);
    await userEvent.type(input, 'Hello world');
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(mockOnSend).toHaveBeenCalledWith('Hello world');
    expect(input).toHaveValue(''); // Input should be cleared after sending
  });

  it('should handle message sending with Enter key', async () => {
    render(
      <ChatInput
        onSend={mockOnSend}
        disabled={false}
      />
    );

    const input = screen.getByPlaceholderText(/type a message/i);
    await userEvent.type(input, 'Hello world{enter}');

    expect(mockOnSend).toHaveBeenCalledWith('Hello world');
    expect(input).toHaveValue('');
  });

  it('should not send empty messages', async () => {
    render(
      <ChatInput
        onSend={mockOnSend}
        disabled={false}
      />
    );

    const input = screen.getByPlaceholderText(/type a message/i);
    await userEvent.type(input, '   {enter}');

    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('should handle file attachments', async () => {
    render(
      <ChatInput
        onSend={mockOnSend}
        onAttachmentAdd={mockOnAttachmentAdd}
        onAttachmentRemove={mockOnAttachmentRemove}
        disabled={false}
      />
    );

    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const input = screen.getByTestId('file-input');
    
    await userEvent.upload(input, file);

    expect(mockOnAttachmentAdd).toHaveBeenCalledWith(expect.any(File));
    
    // Remove attachment
    const removeButton = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeButton);

    expect(mockOnAttachmentRemove).toHaveBeenCalled();
  });

  it('should show reply preview when replying to a message', () => {
    render(
      <ChatInput
        onSend={mockOnSend}
        onCancelReply={mockOnCancelReply}
        replyToMessage={mockReplyToMessage}
        disabled={false}
      />
    );

    expect(screen.getByText('Original message')).toBeInTheDocument();
    
    // Cancel reply
    const cancelButton = screen.getByRole('button', { name: /cancel reply/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancelReply).toHaveBeenCalled();
  });

  it('should handle disabled state', () => {
    render(
      <ChatInput
        onSend={mockOnSend}
        disabled={true}
      />
    );

    const input = screen.getByPlaceholderText(/type a message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    const attachButton = screen.getByRole('button', { name: /attach/i });

    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();
    expect(attachButton).toBeDisabled();
  });

  it('should show typing indicator', async () => {
    render(
      <ChatInput
        onSend={mockOnSend}
        disabled={false}
      />
    );

    const input = screen.getByPlaceholderText(/type a message/i);
    await userEvent.type(input, 'Hello');

    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
  });

  it('should handle file size limits', async () => {
    render(
      <ChatInput
        onSend={mockOnSend}
        onAttachmentAdd={mockOnAttachmentAdd}
        maxFileSize={1024 * 1024} // 1MB
        disabled={false}
      />
    );

    const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    const input = screen.getByTestId('file-input');
    
    await userEvent.upload(input, largeFile);

    expect(mockOnAttachmentAdd).not.toHaveBeenCalled();
    expect(screen.getByText(/file size exceeds limit/i)).toBeInTheDocument();
  });

  it('should handle file type restrictions', async () => {
    render(
      <ChatInput
        onSend={mockOnSend}
        onAttachmentAdd={mockOnAttachmentAdd}
        allowedFileTypes={['image/jpeg', 'image/png']}
        disabled={false}
      />
    );

    const pdfFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByTestId('file-input');
    
    await userEvent.upload(input, pdfFile);

    expect(mockOnAttachmentAdd).not.toHaveBeenCalled();
    expect(screen.getByText(/file type not allowed/i)).toBeInTheDocument();
  });

  it('should handle multiple file attachments', async () => {
    render(
      <ChatInput
        onSend={mockOnSend}
        onAttachmentAdd={mockOnAttachmentAdd}
        onAttachmentRemove={mockOnAttachmentRemove}
        maxAttachments={3}
        disabled={false}
      />
    );

    const files = [
      new File(['1'], 'file1.png', { type: 'image/png' }),
      new File(['2'], 'file2.png', { type: 'image/png' }),
      new File(['3'], 'file3.png', { type: 'image/png' })
    ];

    const input = screen.getByTestId('file-input');
    
    for (const file of files) {
      await userEvent.upload(input, file);
    }

    expect(mockOnAttachmentAdd).toHaveBeenCalledTimes(3);
    
    // Try to add one more file
    const extraFile = new File(['4'], 'file4.png', { type: 'image/png' });
    await userEvent.upload(input, extraFile);

    expect(mockOnAttachmentAdd).toHaveBeenCalledTimes(3);
    expect(screen.getByText(/maximum number of attachments reached/i)).toBeInTheDocument();
  });

  it('should handle emoji picker', async () => {
    render(
      <ChatInput
        onSend={mockOnSend}
        disabled={false}
      />
    );

    // Open emoji picker
    const emojiButton = screen.getByRole('button', { name: /emoji/i });
    fireEvent.click(emojiButton);

    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();

    // Select an emoji
    const emojiElement = screen.getByRole('button', { name: '😊' });
    fireEvent.click(emojiElement);

    const input = screen.getByPlaceholderText(/type a message/i);
    expect(input).toHaveValue('😊');
  });

  it('should maintain input height for long messages', async () => {
    render(
      <ChatInput
        onSend={mockOnSend}
        disabled={false}
      />
    );

    const input = screen.getByPlaceholderText(/type a message/i);
    const longMessage = 'This is a very long message that should cause the input to expand.\n'.repeat(5);
    
    await userEvent.type(input, longMessage);

    expect(input).toHaveStyle({ height: expect.any(String) });
    expect(parseInt(window.getComputedStyle(input).height)).toBeGreaterThan(100);
  });
}); 