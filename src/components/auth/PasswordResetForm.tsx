import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { PasswordService } from '@/services/password';

const passwordService = new PasswordService();

// Schema for initiating reset
const initiateSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

// Schema for completing reset
const completeSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one symbol'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

type InitiateFormData = z.infer<typeof initiateSchema>;
type CompleteFormData = z.infer<typeof completeSchema>;

interface PasswordStrength {
  score: number;
  feedback: string;
  color: string;
}

interface Props {
  mode: 'initiate' | 'complete';
  token?: string;
  onComplete?: () => void;
}

export function PasswordResetForm({ mode, token, onComplete }: Props) {
  const [strength, setStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: '',
    color: 'bg-gray-200'
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const {
    register: initiateRegister,
    handleSubmit: handleInitiateSubmit,
    formState: { errors: initiateErrors, isSubmitting: isInitiateSubmitting }
  } = useForm<InitiateFormData>({
    resolver: zodResolver(initiateSchema)
  });

  const {
    register: completeRegister,
    handleSubmit: handleCompleteSubmit,
    formState: { errors: completeErrors, isSubmitting: isCompleteSubmitting },
    watch
  } = useForm<CompleteFormData>({
    resolver: zodResolver(completeSchema),
    defaultValues: {
      token: token || ''
    }
  });

  const calculateStrength = (password: string): PasswordStrength => {
    const result = passwordService.validatePassword(password);
    const score = result.errors.length === 0 ? 100 : 
      Math.max(0, (5 - result.errors.length) * 20);
    
    return {
      score,
      feedback: result.errors[0] || 'Password is strong',
      color: score >= 80 ? 'bg-green-500' : 
             score >= 60 ? 'bg-yellow-500' : 
             score >= 40 ? 'bg-orange-500' : 
             'bg-red-500'
    };
  };

  const watchNewPassword = watch('newPassword');
  
  // Update strength indicator when password changes
  useState(() => {
    if (mode === 'complete' && watchNewPassword) {
      setStrength(calculateStrength(watchNewPassword));
    }
  }, [mode, watchNewPassword]);

  const onInitiateSubmit = async (data: InitiateFormData) => {
    try {
      setError('');
      setSuccess('');
      
      await passwordService.initiateReset(data.email);
      setSuccess('If an account exists with this email, you will receive password reset instructions.');
    } catch (err) {
      setError('Failed to initiate password reset. Please try again later.');
    }
  };

  const onCompleteSubmit = async (data: CompleteFormData) => {
    try {
      setError('');
      setSuccess('');
      
      await passwordService.completeReset(data.token, data.newPassword);
      setSuccess('Password has been reset successfully.');
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    }
  };

  if (mode === 'initiate') {
    return (
      <form onSubmit={handleInitiateSubmit(onInitiateSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Input
            type="email"
            placeholder="Email Address"
            {...initiateRegister('email')}
            error={initiateErrors.email?.message}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isInitiateSubmitting}
        >
          {isInitiateSubmitting ? 'Sending...' : 'Send Reset Instructions'}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleCompleteSubmit(onCompleteSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {!token && (
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="Reset Token"
            {...completeRegister('token')}
            error={completeErrors.token?.message}
          />
        </div>
      )}

      <div className="space-y-2">
        <Input
          type="password"
          placeholder="New Password"
          {...completeRegister('newPassword')}
          error={completeErrors.newPassword?.message}
        />
        
        <div className="space-y-1">
          <Progress value={strength.score} className={strength.color} />
          <p className="text-sm text-gray-500">{strength.feedback}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Input
          type="password"
          placeholder="Confirm New Password"
          {...completeRegister('confirmPassword')}
          error={completeErrors.confirmPassword?.message}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isCompleteSubmitting}
      >
        {isCompleteSubmitting ? 'Resetting...' : 'Reset Password'}
      </Button>
    </form>
  );
} 