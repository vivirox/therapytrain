import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { PasswordResetForm } from '../PasswordResetForm';
import { PasswordService } from '@/services/password';

// Mock PasswordService
vi.mock('@/services/password', () => ({
  PasswordService: vi.fn().mockImplementation(() => ({
    validatePassword: vi.fn((password: string) => ({
      valid: password.length >= 12,
      errors: password.length >= 12 ? [] : ['Password must be at least 12 characters']
    })),
    initiateReset: vi.fn(),
    completeReset: vi.fn()
  }))
}));

describe('PasswordResetForm', () => {
  const mockInitiateReset = vi.fn();
  const mockCompleteReset = vi.fn();
  const mockOnComplete = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    const mockPasswordService = new PasswordService();
    mockPasswordService.initiateReset = mockInitiateReset;
    mockPasswordService.completeReset = mockCompleteReset;
  });

  describe('Initiate Mode', () => {
    it('renders email input field', () => {
      render(<PasswordResetForm mode="initiate" />);
      
      expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset instructions/i })).toBeInTheDocument();
    });

    it('validates email format', async () => {
      render(<PasswordResetForm mode="initiate" />);
      
      const emailInput = screen.getByPlaceholderText('Email Address');
      await userEvent.type(emailInput, 'invalid-email');
      
      const submitButton = screen.getByRole('button', { name: /send reset instructions/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    it('handles successful initiate reset', async () => {
      mockInitiateReset.mockResolvedValueOnce(undefined);
      
      render(<PasswordResetForm mode="initiate" />);
      
      const emailInput = screen.getByPlaceholderText('Email Address');
      await userEvent.type(emailInput, 'test@example.com');
      
      const submitButton = screen.getByRole('button', { name: /send reset instructions/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/If an account exists with this email/i)).toBeInTheDocument();
      });
      
      expect(mockInitiateReset).toHaveBeenCalledWith('test@example.com');
    });

    it('handles initiate reset error', async () => {
      mockInitiateReset.mockRejectedValueOnce(new Error('Failed to send reset email'));
      
      render(<PasswordResetForm mode="initiate" />);
      
      const emailInput = screen.getByPlaceholderText('Email Address');
      await userEvent.type(emailInput, 'test@example.com');
      
      const submitButton = screen.getByRole('button', { name: /send reset instructions/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to initiate password reset/i)).toBeInTheDocument();
      });
    });
  });

  describe('Complete Mode', () => {
    it('renders password reset form fields', () => {
      render(<PasswordResetForm mode="complete" />);
      
      expect(screen.getByPlaceholderText('Reset Token')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('New Password')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Confirm New Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    });

    it('hides token input when token is provided', () => {
      render(<PasswordResetForm mode="complete" token="test-token" />);
      
      expect(screen.queryByPlaceholderText('Reset Token')).not.toBeInTheDocument();
    });

    it('shows password strength indicator', async () => {
      render(<PasswordResetForm mode="complete" />);
      
      const newPasswordInput = screen.getByPlaceholderText('New Password');
      await userEvent.type(newPasswordInput, 'weak');
      
      expect(screen.getByText(/Password must be at least 12 characters/i)).toBeInTheDocument();
      
      await userEvent.clear(newPasswordInput);
      await userEvent.type(newPasswordInput, 'StrongP@ssw0rd123');
      
      expect(screen.getByText(/Password is strong/i)).toBeInTheDocument();
    });

    it('validates password match', async () => {
      render(<PasswordResetForm mode="complete" token="test-token" />);
      
      await userEvent.type(screen.getByPlaceholderText('New Password'), 'StrongP@ssw0rd123');
      await userEvent.type(screen.getByPlaceholderText('Confirm New Password'), 'DifferentP@ssw0rd123');
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Passwords don't match/i)).toBeInTheDocument();
      });
    });

    it('handles successful password reset', async () => {
      mockCompleteReset.mockResolvedValueOnce(undefined);
      
      render(<PasswordResetForm mode="complete" token="test-token" onComplete={mockOnComplete} />);
      
      await userEvent.type(screen.getByPlaceholderText('New Password'), 'StrongP@ssw0rd123');
      await userEvent.type(screen.getByPlaceholderText('Confirm New Password'), 'StrongP@ssw0rd123');
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Password has been reset successfully/i)).toBeInTheDocument();
      });
      
      expect(mockCompleteReset).toHaveBeenCalledWith('test-token', 'StrongP@ssw0rd123');
      expect(mockOnComplete).toHaveBeenCalled();
    });

    it('handles password reset error', async () => {
      const errorMessage = 'Invalid or expired token';
      mockCompleteReset.mockRejectedValueOnce(new Error(errorMessage));
      
      render(<PasswordResetForm mode="complete" token="test-token" />);
      
      await userEvent.type(screen.getByPlaceholderText('New Password'), 'StrongP@ssw0rd123');
      await userEvent.type(screen.getByPlaceholderText('Confirm New Password'), 'StrongP@ssw0rd123');
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('disables submit button while submitting', async () => {
      mockCompleteReset.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<PasswordResetForm mode="complete" token="test-token" />);
      
      await userEvent.type(screen.getByPlaceholderText('New Password'), 'StrongP@ssw0rd123');
      await userEvent.type(screen.getByPlaceholderText('Confirm New Password'), 'StrongP@ssw0rd123');
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      fireEvent.click(submitButton);
      
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Resetting...');
      
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
        expect(submitButton).toHaveTextContent('Reset Password');
      });
    });
  });
}); 