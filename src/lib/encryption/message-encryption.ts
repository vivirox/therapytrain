import { getUserKeyPair, deriveSharedSecret, encryptMessage, decryptMessage } from './key-management';
import { kv } from '@vercel/kv';
import { cache } from 'react';

const MESSAGE_KEY_PREFIX = 'encryption:messages:';

interface EncryptedMessage {
  encryptedContent: string;
  iv: string;
  senderPublicKey: JsonWebKey;
  recipientId: string;
  timestamp: string;
}

// Cache encrypted messages
const messageCache = new Map<string, EncryptedMessage>();

// Store encrypted message
export async function storeEncryptedMessage(messageId: string, message: EncryptedMessage): Promise<void> {
  const key = `${MESSAGE_KEY_PREFIX}${messageId}`;
  await kv.set(key, message);
  messageCache.set(messageId, message);
}

// Get encrypted message
export const getEncryptedMessage = cache(async (messageId: string): Promise<EncryptedMessage | null> => {
  // Check cache first
  const cachedMessage = messageCache.get(messageId);
  if (cachedMessage) {
    return cachedMessage;
  }

  // If not in cache, get from KV store
  const key = `${MESSAGE_KEY_PREFIX}${messageId}`;
  const message = await kv.get<EncryptedMessage>(key);
  
  if (message) {
    messageCache.set(messageId, message);
  }
  
  return message;
});

// Encrypt a message for a recipient
export async function encryptMessageForRecipient(
  content: string,
  senderId: string,
  recipientId: string
): Promise<EncryptedMessage> {
  // Get sender's key pair
  const senderKeyPair = await getUserKeyPair(senderId);
  if (!senderKeyPair) {
    throw new Error('Sender key pair not found');
  }

  // Get recipient's key pair
  const recipientKeyPair = await getUserKeyPair(recipientId);
  if (!recipientKeyPair) {
    throw new Error('Recipient key pair not found');
  }

  // Derive shared secret
  const sharedSecret = await deriveSharedSecret(
    senderKeyPair.privateKey,
    recipientKeyPair.publicKey
  );

  // Encrypt the message
  const { encryptedData, iv } = await encryptMessage(content, sharedSecret);

  const encryptedMessage: EncryptedMessage = {
    encryptedContent: encryptedData,
    iv,
    senderPublicKey: senderKeyPair.publicKey,
    recipientId,
    timestamp: new Date().toISOString(),
  };

  return encryptedMessage;
}

// Decrypt a message
export async function decryptMessageContent(
  encryptedMessage: EncryptedMessage,
  recipientId: string
): Promise<string> {
  // Get recipient's key pair
  const recipientKeyPair = await getUserKeyPair(recipientId);
  if (!recipientKeyPair) {
    throw new Error('Recipient key pair not found');
  }

  // Derive shared secret
  const sharedSecret = await deriveSharedSecret(
    recipientKeyPair.privateKey,
    encryptedMessage.senderPublicKey
  );

  // Decrypt the message
  return await decryptMessage(
    encryptedMessage.encryptedContent,
    encryptedMessage.iv,
    sharedSecret
  );
}

// Encrypt message for multiple recipients
export async function encryptMessageForGroup(
  content: string,
  senderId: string,
  recipientIds: string[]
): Promise<Map<string, EncryptedMessage>> {
  const encryptedMessages = new Map<string, EncryptedMessage>();

  for (const recipientId of recipientIds) {
    const encryptedMessage = await encryptMessageForRecipient(
      content,
      senderId,
      recipientId
    );
    encryptedMessages.set(recipientId, encryptedMessage);
  }

  return encryptedMessages;
}

// Batch decrypt messages
export async function batchDecryptMessages(
  encryptedMessages: EncryptedMessage[],
  recipientId: string
): Promise<string[]> {
  const decryptedMessages: string[] = [];

  for (const message of encryptedMessages) {
    const decryptedContent = await decryptMessageContent(message, recipientId);
    decryptedMessages.push(decryptedContent);
  }

  return decryptedMessages;
} 