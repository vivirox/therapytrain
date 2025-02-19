import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatContainer } from '../ChatContainer';
import { useChat } from '@/hooks/useChat';
import { useThread } from '@/hooks/useThread';
import { ZKChatMessage } from '@/lib/zk/types';
import { Thread } from '@/lib/zk/thread-management';

// Mock hooks
vi.mock('@/hooks/useChat', () => ({
  useChat: vi.fn()
}));

vi.mock('@/hooks/useThread', () => ({
  useThread: vi.fn()
}));

describe('ChatContainer', () => {
  const mockMessages: ZKChatMessage[] = [
    {
      id: 'msg-1',
      senderId: 'user-1',
      decryptedContent: 'Hello',
      timestamp: new Date().toISOString(),
      isEncrypted: true
    },
    {
      id: 'msg-2',
      senderId: 'user-2',
      decryptedContent: 'Hi there',
      timestamp: new Date().toISOString(),
      isEncrypted: true
    }
  ];

  const mockThread: Thread = {
    id: 'thread-1',
    title: 'Test Thread',
    participants: ['user-1', 'user-2'],
    messageCount: 2,
    isUnread: false,
    lastMessage: mockMessages[1],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockSendMessage = vi.fn();
  const mockEditMessage = vi.fn();
  const mockCreateNewThread = vi.fn();
  const mockMarkAsRead = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useChat as any).mockReturnValue({
      messages: mockMessages,
      isLoading: false,
      error: null,
      sendMessage: mockSendMessage,
      editMessage: mockEditMessage
    });

    (useThread as any).mockReturnValue({
      thread: mockThread,
      participants: mockThread.participants,
      isLoading: false,
      error: null,
      createNewThread: mockCreateNewThread,
      markAsRead: mockMarkAsRead
    });
  });

  it('should render chat container with messages', () => {
    render(
      <ChatContainer
        recipientId="user-2"
        threadId="thread-1"
      />
    );

    expect(screen.getByText('Test Thread')).toBeInTheDocument();
    expect(screen.getByText('2 participants • 2 messages')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  it('should handle message sending', async () => {
    render(
      <ChatContainer
        recipientId="user-2"
        threadId="thread-1"
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New message' } });
    fireEvent.click(screen.getByText('Send'));

    expect(mockSendMessage).toHaveBeenCalledWith('New message', 'thread-1', undefined);
  });

  it('should handle message editing', async () => {
    render(
      <ChatContainer
        recipientId="user-1"
        threadId="thread-1"
      />
    );

    // Find and click edit button on own message
    const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
    fireEvent.click(editButton);

    // Edit the message
    const input = screen.getByDisplayValue('Hello');
    fireEvent.change(input, { target: { value: 'Updated message' } });
    fireEvent.click(screen.getByText('Save'));

    expect(mockEditMessage).toHaveBeenCalledWith('msg-1', 'Updated message');
  });

  it('should handle message replies and thread creation', async () => {
    render(
      <ChatContainer
        recipientId="user-2"
      />
    );

    // Find and click reply button
    const replyButton = screen.getAllByRole('button', { name: /reply/i })[0];
    fireEvent.click(replyButton);

    // Send reply message
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Reply message' } });
    fireEvent.click(screen.getByText('Send'));

    expect(mockCreateNewThread).toHaveBeenCalledWith(['user-2'], 'Hello');
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Reply message', expect.any(String), 'msg-1');
    });
  });

  it('should mark thread as read when opened', () => {
    (useThread as any).mockReturnValue({
      ...mockThread,
      thread: { ...mockThread, isUnread: true }
    });

    render(
      <ChatContainer
        recipientId="user-2"
        threadId="thread-1"
      />
    );

    expect(mockMarkAsRead).toHaveBeenCalled();
  });

  it('should handle loading state', () => {
    (useChat as any).mockReturnValue({
      messages: [],
      isLoading: true,
      error: null,
      sendMessage: mockSendMessage,
      editMessage: mockEditMessage
    });

    render(
      <ChatContainer
        recipientId="user-2"
        threadId="thread-1"
      />
    );

    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('should display error messages', () => {
    const error = 'Failed to load messages';
    (useChat as any).mockReturnValue({
      messages: [],
      isLoading: false,
      error,
      sendMessage: mockSendMessage,
      editMessage: mockEditMessage
    });

    render(
      <ChatContainer
        recipientId="user-2"
        threadId="thread-1"
      />
    );

    expect(screen.getByText(`Error: ${error}`)).toBeInTheDocument();
  });

  it('should handle thread error state', () => {
    const error = 'Failed to load thread';
    (useThread as any).mockReturnValue({
      thread: null,
      participants: [],
      isLoading: false,
      error,
      createNewThread: mockCreateNewThread,
      markAsRead: mockMarkAsRead
    });

    render(
      <ChatContainer
        recipientId="user-2"
        threadId="thread-1"
      />
    );

    expect(screen.getByText(`Error: ${error}`)).toBeInTheDocument();
  });

  it('should scroll to bottom when new messages arrive', async () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    render(
      <ChatContainer
        recipientId="user-2"
        threadId="thread-1"
      />
    );

    // Update messages
    (useChat as any).mockReturnValue({
      messages: [...mockMessages, {
        id: 'msg-3',
        senderId: 'user-1',
        decryptedContent: 'New message',
        timestamp: new Date().toISOString(),
        isEncrypted: true
      }],
      isLoading: false,
      error: null,
      sendMessage: mockSendMessage,
      editMessage: mockEditMessage
    });

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
    });
  });
}); 