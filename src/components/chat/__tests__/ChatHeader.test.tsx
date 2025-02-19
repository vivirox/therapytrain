import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatHeader } from '../ChatHeader';
import { Session } from '@/../../../backend/src/types/chat';

// Mock dialog component
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

// Mock dropdown menu component
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children }: any) => <button>{children}</button>,
}));

describe('ChatHeader', () => {
  const mockSession: Session = {
    id: 'session-1',
    title: 'Test Chat',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    participant_count: 2,
    message_count: 10,
    is_encrypted: true,
    settings: {
      notifications: true,
      sound: true,
      theme: 'light'
    }
  };

  const mockHandleDelete = vi.fn();
  const mockHandleExport = vi.fn();
  const mockHandleShare = vi.fn();
  const mockHandleSettingsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render session title and information', () => {
    render(
      <ChatHeader
        session={mockSession}
        onDelete={mockHandleDelete}
        onExport={mockHandleExport}
        onShare={mockHandleShare}
        onSettingsChange={mockHandleSettingsChange}
      />
    );

    expect(screen.getByText('Test Chat')).toBeInTheDocument();
    expect(screen.getByText('2 participants • 10 messages')).toBeInTheDocument();
  });

  it('should show encryption status for encrypted sessions', () => {
    render(
      <ChatHeader
        session={mockSession}
        onDelete={mockHandleDelete}
        onExport={mockHandleExport}
        onShare={mockHandleShare}
        onSettingsChange={mockHandleSettingsChange}
      />
    );

    expect(screen.getByTitle('Encrypted chat')).toBeInTheDocument();
  });

  it('should open settings dialog when settings button is clicked', async () => {
    render(
      <ChatHeader
        session={mockSession}
        onDelete={mockHandleDelete}
        onExport={mockHandleExport}
        onShare={mockHandleShare}
        onSettingsChange={mockHandleSettingsChange}
      />
    );

    // Open dropdown menu
    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    
    // Click settings option
    fireEvent.click(screen.getByText(/settings/i));

    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText('Chat Settings')).toBeInTheDocument();
    });
  });

  it('should handle settings changes', async () => {
    render(
      <ChatHeader
        session={mockSession}
        onDelete={mockHandleDelete}
        onExport={mockHandleExport}
        onShare={mockHandleShare}
        onSettingsChange={mockHandleSettingsChange}
      />
    );

    // Open settings
    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    fireEvent.click(screen.getByText(/settings/i));

    // Toggle notifications
    const notificationsToggle = screen.getByRole('switch', { name: /notifications/i });
    fireEvent.click(notificationsToggle);

    expect(mockHandleSettingsChange).toHaveBeenCalledWith({
      ...mockSession.settings,
      notifications: false
    });
  });

  it('should show delete confirmation dialog', async () => {
    render(
      <ChatHeader
        session={mockSession}
        onDelete={mockHandleDelete}
        onExport={mockHandleExport}
        onShare={mockHandleShare}
        onSettingsChange={mockHandleSettingsChange}
      />
    );

    // Open dropdown menu
    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    
    // Click delete option
    fireEvent.click(screen.getByText(/delete/i));

    await waitFor(() => {
      expect(screen.getByText('Delete Chat')).toBeInTheDocument();
      expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
    });

    // Confirm deletion
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(mockHandleDelete).toHaveBeenCalled();
  });

  it('should handle chat export', () => {
    render(
      <ChatHeader
        session={mockSession}
        onDelete={mockHandleDelete}
        onExport={mockHandleExport}
        onShare={mockHandleShare}
        onSettingsChange={mockHandleSettingsChange}
      />
    );

    // Open dropdown menu
    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    
    // Click export option
    fireEvent.click(screen.getByText(/export/i));

    expect(mockHandleExport).toHaveBeenCalled();
  });

  it('should handle chat sharing', () => {
    render(
      <ChatHeader
        session={mockSession}
        onDelete={mockHandleDelete}
        onExport={mockHandleExport}
        onShare={mockHandleShare}
        onSettingsChange={mockHandleSettingsChange}
      />
    );

    // Open dropdown menu
    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    
    // Click share option
    fireEvent.click(screen.getByText(/share/i));

    expect(mockHandleShare).toHaveBeenCalled();
  });

  it('should show session activity status', () => {
    const activeSession = {
      ...mockSession,
      last_activity: new Date().toISOString(),
      active_participants: ['user-1', 'user-2']
    };

    render(
      <ChatHeader
        session={activeSession}
        onDelete={mockHandleDelete}
        onExport={mockHandleExport}
        onShare={mockHandleShare}
        onSettingsChange={mockHandleSettingsChange}
      />
    );

    expect(screen.getByText(/2 active participants/i)).toBeInTheDocument();
    expect(screen.getByText(/active now/i)).toBeInTheDocument();
  });

  it('should show typing indicator when participants are typing', () => {
    const typingSession = {
      ...mockSession,
      typing_participants: ['user-2']
    };

    render(
      <ChatHeader
        session={typingSession}
        onDelete={mockHandleDelete}
        onExport={mockHandleExport}
        onShare={mockHandleShare}
        onSettingsChange={mockHandleSettingsChange}
      />
    );

    expect(screen.getByText(/1 person is typing/i)).toBeInTheDocument();
  });

  it('should handle theme changes', async () => {
    render(
      <ChatHeader
        session={mockSession}
        onDelete={mockHandleDelete}
        onExport={mockHandleExport}
        onShare={mockHandleShare}
        onSettingsChange={mockHandleSettingsChange}
      />
    );

    // Open settings
    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    fireEvent.click(screen.getByText(/settings/i));

    // Change theme
    const themeSelect = screen.getByRole('combobox', { name: /theme/i });
    fireEvent.change(themeSelect, { target: { value: 'dark' } });

    expect(mockHandleSettingsChange).toHaveBeenCalledWith({
      ...mockSession.settings,
      theme: 'dark'
    });
  });

  it('should handle sound settings', async () => {
    render(
      <ChatHeader
        session={mockSession}
        onDelete={mockHandleDelete}
        onExport={mockHandleExport}
        onShare={mockHandleShare}
        onSettingsChange={mockHandleSettingsChange}
      />
    );

    // Open settings
    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    fireEvent.click(screen.getByText(/settings/i));

    // Toggle sound
    const soundToggle = screen.getByRole('switch', { name: /sound/i });
    fireEvent.click(soundToggle);

    expect(mockHandleSettingsChange).toHaveBeenCalledWith({
      ...mockSession.settings,
      sound: false
    });
  });
}); 