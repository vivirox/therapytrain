import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { PasswordChangeForm } from '../PasswordChangeForm';
import { PasswordService } from '@/services/password';

// Mock PasswordService
vi.mock('@/services/password', () => ({
  PasswordService: vi.fn().mockImplementation(() => ({
    validatePassword: vi.fn((password: string) => ({
      valid: password.length >= 12,
      errors: password.length >= 12 ? [] : ['Password must be at least 12 characters']
    })),
    updatePassword: vi.fn()
  }))
}));

describe('PasswordChangeForm', () => {
  const mockUpdatePassword = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    const mockPasswordService = new PasswordService();
    mockPasswordService.updatePassword = mockUpdatePassword;
  });

  it('renders form fields correctly', () => {
    render(<PasswordChangeForm />);
    
    expect(screen.getByPlaceholderText('Current Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('New Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm New Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    render(<PasswordChangeForm />);
    
    const submitButton = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Current password is required')).toBeInTheDocument();
    });
  });

  it('shows password strength indicator', async () => {
    render(<PasswordChangeForm />);
    
    const newPasswordInput = screen.getByPlaceholderText('New Password');
    await userEvent.type(newPasswordInput, 'weak');
    
    expect(screen.getByText(/Password must be at least 12 characters/i)).toBeInTheDocument();
    
    await userEvent.clear(newPasswordInput);
    await userEvent.type(newPasswordInput, 'StrongP@ssw0rd123');
    
    expect(screen.getByText(/Password is strong/i)).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    render(<PasswordChangeForm />);
    
    await userEvent.type(screen.getByPlaceholderText('New Password'), 'StrongP@ssw0rd123');
    await userEvent.type(screen.getByPlaceholderText('Confirm New Password'), 'DifferentP@ssw0rd123');
    
    const submitButton = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Passwords don't match/i)).toBeInTheDocument();
    });
  });

  it('handles successful password update', async () => {
    mockUpdatePassword.mockResolvedValueOnce(undefined);
    
    render(<PasswordChangeForm />);
    
    await userEvent.type(screen.getByPlaceholderText('Current Password'), 'CurrentP@ssw0rd123');
    await userEvent.type(screen.getByPlaceholderText('New Password'), 'StrongP@ssw0rd123');
    await userEvent.type(screen.getByPlaceholderText('Confirm New Password'), 'StrongP@ssw0rd123');
    
    const submitButton = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Password updated successfully/i)).toBeInTheDocument();
    });
    
    expect(mockUpdatePassword).toHaveBeenCalledWith(
      'current-user-id',
      'CurrentP@ssw0rd123',
      'StrongP@ssw0rd123'
    );
  });

  it('handles password update error', async () => {
    const errorMessage = 'Failed to update password';
    mockUpdatePassword.mockRejectedValueOnce(new Error(errorMessage));
    
    render(<PasswordChangeForm />);
    
    await userEvent.type(screen.getByPlaceholderText('Current Password'), 'CurrentP@ssw0rd123');
    await userEvent.type(screen.getByPlaceholderText('New Password'), 'StrongP@ssw0rd123');
    await userEvent.type(screen.getByPlaceholderText('Confirm New Password'), 'StrongP@ssw0rd123');
    
    const submitButton = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('disables submit button while submitting', async () => {
    mockUpdatePassword.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<PasswordChangeForm />);
    
    await userEvent.type(screen.getByPlaceholderText('Current Password'), 'CurrentP@ssw0rd123');
    await userEvent.type(screen.getByPlaceholderText('New Password'), 'StrongP@ssw0rd123');
    await userEvent.type(screen.getByPlaceholderText('Confirm New Password'), 'StrongP@ssw0rd123');
    
    const submitButton = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(submitButton);
    
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Updating...');
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
      expect(submitButton).toHaveTextContent('Update Password');
    });
  });
}); 