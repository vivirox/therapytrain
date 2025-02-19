import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ChatProvider, useChat } from '../ChatContext';
import { Session, Message } from '../../../backend/src/types/chat';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock EventSource
const mockEventSource = vi.fn();
global.EventSource = mockEventSource as any;

// Test component using the chat hook
function TestComponent() {
  const { state, createSession, sendMessage, loadSession, loadMessages } = useChat();
  const { sessions, currentSession, messages, isLoading, error } = state;

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading...' : 'Ready'}</div>
      {error && <div data-testid="error">{error}</div>}
      
      <div data-testid="sessions">
        {sessions.map((session: Session) => (
          <div key={session.id} onClick={() => loadSession(session.id)}>
            {session.title}
          </div>
        ))}
      </div>

      {currentSession && (
        <div data-testid="current-session">
          <h2>{currentSession.title}</h2>
          <div data-testid="messages">
            {messages.map((msg: Message) => (
              <div key={msg.id}>{msg.content}</div>
            ))}
          </div>
          <button onClick={() => sendMessage('Test message')}>Send Message</button>
        </div>
      )}

      <button onClick={() => createSession('New Chat')}>Create Session</button>
    </div>
  );
}

describe('ChatContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('should initialize with empty state', () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
    expect(screen.queryByTestId('error')).not.toBeInTheDocument();
    expect(screen.getByTestId('sessions')).toBeEmptyDOMElement();
  });

  it('should create a new session', async () => {
    const mockSession = {
      id: 'session-1',
      title: 'New Chat',
      created_at: new Date().toISOString()
    };

    mockFetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSession)
      })
    );

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    fireEvent.click(screen.getByText('Create Session'));

    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toBeInTheDocument();
    });

    expect(screen.getByTestId('current-session')).toHaveTextContent('New Chat');
  });

  it('should handle session creation error', async () => {
    mockFetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        status: 500
      })
    );

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    fireEvent.click(screen.getByText('Create Session'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to create session');
    });
  });

  it('should send a message', async () => {
    const mockSession = {
      id: 'session-1',
      title: 'Test Chat',
      created_at: new Date().toISOString()
    };

    const mockMessage = {
      id: 'msg-1',
      content: 'Test message',
      created_at: new Date().toISOString()
    };

    mockFetch
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSession)
        })
      )
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMessage)
        })
      );

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    // Create session first
    fireEvent.click(screen.getByText('Create Session'));
    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toBeInTheDocument();
    });

    // Send message
    fireEvent.click(screen.getByText('Send Message'));
    await waitFor(() => {
      expect(screen.getByTestId('messages')).toHaveTextContent('Test message');
    });
  });

  it('should handle message sending error', async () => {
    const mockSession = {
      id: 'session-1',
      title: 'Test Chat',
      created_at: new Date().toISOString()
    };

    mockFetch
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSession)
        })
      )
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          status: 500
        })
      );

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    // Create session first
    fireEvent.click(screen.getByText('Create Session'));
    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toBeInTheDocument();
    });

    // Send message
    fireEvent.click(screen.getByText('Send Message'));
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to send message');
    });
  });

  it('should handle real-time updates', async () => {
    const mockSession = {
      id: 'session-1',
      title: 'Test Chat',
      created_at: new Date().toISOString()
    };

    let eventSourceInstance: any;
    mockEventSource.mockImplementation(function(this: any) {
      eventSourceInstance = this;
      return this;
    });

    mockFetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSession)
      })
    );

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    // Create session first
    fireEvent.click(screen.getByText('Create Session'));
    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toBeInTheDocument();
    });

    // Simulate real-time message
    act(() => {
      eventSourceInstance.onmessage({
        data: JSON.stringify({
          type: 'message',
          payload: {
            id: 'msg-2',
            content: 'Real-time message',
            created_at: new Date().toISOString()
          }
        })
      });
    });

    expect(screen.getByTestId('messages')).toHaveTextContent('Real-time message');
  });

  it('should handle real-time errors', async () => {
    const mockSession = {
      id: 'session-1',
      title: 'Test Chat',
      created_at: new Date().toISOString()
    };

    let eventSourceInstance: any;
    mockEventSource.mockImplementation(function(this: any) {
      eventSourceInstance = this;
      return this;
    });

    mockFetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSession)
      })
    );

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    // Create session first
    fireEvent.click(screen.getByText('Create Session'));
    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toBeInTheDocument();
    });

    // Simulate error event
    act(() => {
      eventSourceInstance.onmessage({
        data: JSON.stringify({
          type: 'error',
          payload: { error: 'Connection error' }
        })
      });
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Connection error');
  });

  it('should clean up EventSource on unmount', async () => {
    const mockSession = {
      id: 'session-1',
      title: 'Test Chat',
      created_at: new Date().toISOString()
    };

    const mockEventSourceClose = vi.fn();
    mockEventSource.mockImplementation(function(this: any) {
      this.close = mockEventSourceClose;
      return this;
    });

    mockFetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSession)
      })
    );

    const { unmount } = render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    // Create session first
    fireEvent.click(screen.getByText('Create Session'));
    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toBeInTheDocument();
    });

    unmount();
    expect(mockEventSourceClose).toHaveBeenCalled();
  });
}); 