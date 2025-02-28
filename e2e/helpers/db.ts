import { supabase } from '../../src/lib/supabaseClient';

// Mock database operations for testing
export async function resetTestDatabase() {
  // No-op in mock mode
  return;
}

export async function createResetToken(email: string): Promise<string> {
  // Return a mock token
  return 'mock-reset-token';
}

export async function clearFailedLoginAttempts(email: string) {
  // No-op in mock mode
  return;
} 