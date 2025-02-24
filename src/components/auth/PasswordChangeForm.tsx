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

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
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

type FormData = z.infer<typeof passwordSchema>;

interface PasswordStrength {
  score: number;
  feedback: string;
  color: string;
}

export function PasswordChangeForm() {
  const [strength, setStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: '',
    color: 'bg-gray-200'
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset
  } = useForm<FormData>({
    resolver: zodResolver(passwordSchema)
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
    if (watchNewPassword) {
      setStrength(calculateStrength(watchNewPassword));
    }
  }, [watchNewPassword]);

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      setSuccess('');
      
      await passwordService.updatePassword(
        'current-user-id', // TODO: Get from auth context
        data.currentPassword,
        data.newPassword
      );
      
      setSuccess('Password updated successfully');
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          type="password"
          placeholder="Current Password"
          {...register('currentPassword')}
          error={errors.currentPassword?.message}
        />
      </div>

      <div className="space-y-2">
        <Input
          type="password"
          placeholder="New Password"
          {...register('newPassword')}
          error={errors.newPassword?.message}
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
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Updating...' : 'Update Password'}
      </Button>
    </form>
  );
} 