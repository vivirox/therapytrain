import { createClient } from '@supabase/supabase-js';
import { generateKeyPair, verifyKeyPair } from './crypto';
import { ZKKeyPair } from './types';
import { Database } from '../database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function initializeUserKeys(userId: string): Promise<ZKKeyPair> {
  // Check if user already has keys
  const { data: existingKeys } = await supabase
    .from('user_keys')
    .select('public_key')
    .eq('user_id', userId)
    .single();

  if (existingKeys) {
    throw new Error('User keys already exist');
  }

  // Generate new key pair
  const keyPair = await generateKeyPair();

  // Store public key
  await supabase.from('user_keys').insert({
    user_id: userId,
    public_key: keyPair.publicKey,
  });

  return keyPair;
}

export async function rotateUserKeys(userId: string): Promise<ZKKeyPair> {
  // Generate new key pair
  const keyPair = await generateKeyPair();

  // Update public key
  const { error } = await supabase
    .from('user_keys')
    .update({
      public_key: keyPair.publicKey,
      last_rotation: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    throw new Error('Failed to rotate keys: ' + error.message);
  }

  return keyPair;
}

export async function getUserPublicKey(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('user_keys')
    .select('public_key')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error('Failed to get user public key');
  }

  return data.public_key;
}

export async function verifyUserKeys(userId: string, keyPair: ZKKeyPair): Promise<boolean> {
  try {
    // Verify key pair is valid
    const isValid = await verifyKeyPair(keyPair);
    if (!isValid) {
      return false;
    }

    // Verify public key matches stored key
    const storedPublicKey = await getUserPublicKey(userId);
    return storedPublicKey === keyPair.publicKey;
  } catch {
    return false;
  }
}

export async function shouldRotateKeys(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_keys')
    .select('last_rotation')
    .eq('user_id', userId)
    .single();

  if (!data) {
    return true;
  }

  const lastRotation = new Date(data.last_rotation);
  const now = new Date();
  const daysSinceRotation = (now.getTime() - lastRotation.getTime()) / (1000 * 60 * 60 * 24);

  // Rotate keys if they're older than 30 days
  return daysSinceRotation > 30;
}

export async function backupKeys(keyPair: ZKKeyPair): Promise<string> {
  // In a real implementation, this would securely encrypt and backup the keys
  // For now, we'll just return a JSON string
  return JSON.stringify(keyPair);
}

export async function restoreKeys(backup: string): Promise<ZKKeyPair> {
  try {
    const keyPair = JSON.parse(backup) as ZKKeyPair;
    const isValid = await verifyKeyPair(keyPair);
    if (!isValid) {
      throw new Error('Invalid key pair');
    }
    return keyPair;
  } catch {
    throw new Error('Failed to restore keys');
  }
} 