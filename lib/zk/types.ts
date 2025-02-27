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
  iv: string;
  timestamp: number;
  thread_id: string;
  parent_message_id?: string;
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
  role: 'user' | 'assistant';
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

export interface UserSession {
  id: string;
  privateKey: string;
  publicKey: string;
}

export interface SharedKey {
  key: string;
  userId: string;
  recipientId: string;
}

export interface UserKeys {
  user_id: string;
  public_key: string;
  created_at: string;
  updated_at: string;
}

export interface SecureMessage {
  id: string;
  encryptedContent: string;
  iv: string;
  proof: ZKProof;
  metadata: MessageMetadata;
}

export interface ZKProof {
  signature: string;
  publicKey: string;
  timestamp: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface MessageMetadata {
  senderId: string;
  recipientId: string;
  threadId: string;
  timestamp: number;
  type: 'text' | 'file' | 'image';
  status: 'sent' | 'delivered' | 'read';
} 