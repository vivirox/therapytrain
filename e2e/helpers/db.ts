import { supabase } from '@/lib/supabaseClient';

export async function resetTestDatabase() {
  try {
    // Delete all test data
    await supabase.transaction(async (tx) => {
      // Clear password history
      await tx
        .from('password_history')
        .delete()
        .neq('user_id', 'system');

      // Clear failed attempts
      await tx
        .from('failed_attempts')
        .delete()
        .neq('user_id', 'system');

      // Clear reset tokens
      await tx
        .from('password_reset_tokens')
        .delete()
        .neq('user_id', 'system');

      // Clear test users
      await tx
        .from('users')
        .delete()
        .eq('email', 'test@example.com');
    });
  } catch (error) {
    console.error('Failed to reset test database:', error);
    throw error;
  }
}

export async function createResetToken(email: string): Promise<string> {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (!user) {
      throw new Error('User not found');
    }

    const token = crypto.randomUUID();
    const hashedToken = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(token)
    ).then(buf => Buffer.from(buf).toString('hex'));

    await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token: hashedToken,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      });

    return token;
  } catch (error) {
    console.error('Failed to create reset token:', error);
    throw error;
  }
}

export async function clearFailedLoginAttempts(email: string) {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (user) {
      await supabase
        .from('failed_attempts')
        .delete()
        .eq('user_id', user.id);
    }
  } catch (error) {
    console.error('Failed to clear login attempts:', error);
    throw error;
  }
} 