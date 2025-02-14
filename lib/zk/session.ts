import { createClient } from '@supabase/supabase-js';
import { UserSession, SharedKey } from './types';
import { generateKey, generateKeyPair } from './crypto';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

// In-memory session cache
const sessionCache = new Map<string, UserSession>();
const sharedKeyCache = new Map<string, SharedKey>();

/**
 * Get or create a user session
 */
export async function getSession(userId: string): Promise<UserSession | null> {
  // Check cache first
  const cachedSession = sessionCache.get(userId);
  if (cachedSession) {
    return cachedSession;
  }

  // Get session from database
  const { data: sessionData, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching session:', error);
    return null;
  }

  if (sessionData) {
    const session: UserSession = {
      id: sessionData.user_id,
      privateKey: sessionData.private_key,
      publicKey: sessionData.public_key,
    };
    sessionCache.set(userId, session);
    return session;
  }

  // Create new session if none exists
  const keyPair = await generateKeyPair();
  const newSession: UserSession = {
    id: userId,
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
  };

  const { error: insertError } = await supabase
    .from('user_sessions')
    .insert([{
      user_id: userId,
      private_key: keyPair.privateKey,
      public_key: keyPair.publicKey,
    }]);

  if (insertError) {
    console.error('Error creating session:', insertError);
    return null;
  }

  sessionCache.set(userId, newSession);
  return newSession;
}

/**
 * Get or create a shared key between two users
 */
export async function getOrCreateSharedKey(
  userSession: UserSession,
  recipientId: string,
  recipientPublicKey: string
): Promise<string> {
  const cacheKey = `${userSession.id}-${recipientId}`;
  const cachedKey = sharedKeyCache.get(cacheKey);
  if (cachedKey) {
    return cachedKey.key;
  }

  // Get shared key from database
  const { data: keyData, error } = await supabase
    .from('shared_keys')
    .select('*')
    .eq('user_id', userSession.id)
    .eq('recipient_id', recipientId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching shared key:', error);
    throw error;
  }

  if (keyData) {
    const sharedKey: SharedKey = {
      key: keyData.key,
      userId: keyData.user_id,
      recipientId: keyData.recipient_id,
    };
    sharedKeyCache.set(cacheKey, sharedKey);
    return sharedKey.key;
  }

  // Create new shared key if none exists
  const sharedKey = generateKey();
  const { error: insertError } = await supabase
    .from('shared_keys')
    .insert([{
      user_id: userSession.id,
      recipient_id: recipientId,
      key: sharedKey,
    }]);

  if (insertError) {
    console.error('Error creating shared key:', insertError);
    throw insertError;
  }

  const newSharedKey: SharedKey = {
    key: sharedKey,
    userId: userSession.id,
    recipientId,
  };
  sharedKeyCache.set(cacheKey, newSharedKey);
  return sharedKey;
}

/**
 * Clear session cache for a user
 */
export function clearSessionCache(userId: string) {
  sessionCache.delete(userId);
  // Clear related shared keys
  for (const [key] of sharedKeyCache) {
    if (key.startsWith(userId)) {
      sharedKeyCache.delete(key);
    }
  }
} 