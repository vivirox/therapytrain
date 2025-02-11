import { User } from '@supabase/supabase-js';

export interface ZKKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface ZKMessage {
  id: string;
  senderId: string;
  recipientId: string;
  encryptedContent: string;
  iv: string; // Initialization vector
  timestamp: number;
}

export interface ZKSession {
  id: string;
  user: User;
  keyPair: ZKKeyPair;
  sharedKeys: Map<string, string>; // userId -> sharedKey
}

export interface ZKEncryptedPayload {
  content: string;
  iv: string;
}

export interface ZKChatMessage extends ZKMessage {
  decryptedContent?: string;
  status: 'sent' | 'delivered' | 'read';
  error?: string;
}

export type ZKEncryptionKey = string;
export type ZKDecryptionKey = string;

export interface ZKConfig {
  keySize: number;
  ivSize: number;
  algorithm: string;
  iterations: number;
} 