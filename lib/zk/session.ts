import { User } from '@supabase/supabase-js';
import { ZKSession, ZKKeyPair } from './types';
import { generateKeyPair, generateSharedKey } from './crypto';

const sessions = new Map<string, ZKSession>();

export async function createSession(user: User): Promise<ZKSession> {
  const existingSession = sessions.get(user.id);
  if (existingSession) {
    return existingSession;
  }

  const keyPair = await generateKeyPair();
  const session: ZKSession = {
    id: user.id,
    user,
    keyPair,
    sharedKeys: new Map(),
  };

  sessions.set(user.id, session);
  return session;
}

export async function getSession(userId: string): Promise<ZKSession | null> {
  return sessions.get(userId) || null;
}

export async function updateSessionKeys(session: ZKSession, keyPair: ZKKeyPair): Promise<void> {
  session.keyPair = keyPair;
  session.sharedKeys.clear(); // Clear old shared keys as they're no longer valid
  sessions.set(session.id, session);
}

export async function getOrCreateSharedKey(
  session: ZKSession,
  recipientId: string,
  recipientPublicKey: string
): Promise<string> {
  const existingKey = session.sharedKeys.get(recipientId);
  if (existingKey) {
    return existingKey;
  }

  const sharedKey = await generateSharedKey(session.keyPair.privateKey, recipientPublicKey);
  session.sharedKeys.set(recipientId, sharedKey);
  return sharedKey;
}

export function destroySession(userId: string): void {
  sessions.delete(userId);
}

export function getAllSessions(): ZKSession[] {
  return Array.from(sessions.values());
}

export async function rotateSessionKeys(session: ZKSession): Promise<void> {
  const newKeyPair = await generateKeyPair();
  await updateSessionKeys(session, newKeyPair);
}

export function isSessionActive(userId: string): boolean {
  return sessions.has(userId);
} 