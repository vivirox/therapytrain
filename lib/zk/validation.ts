import { createHmac, randomBytes } from 'crypto';
import { ZKProof, ValidationResult, MessageMetadata } from './types';

const SIGNATURE_ALGORITHM = 'sha256';
const PROOF_VERSION = '1.0.0';

export async function generateProof(message: string, metadata: MessageMetadata): Promise<ZKProof> {
  try {
    const timestamp = Date.now();
    const nonce = randomBytes(16).toString('hex');
    
    // Create a signature using HMAC-SHA256
    const hmac = createHmac(SIGNATURE_ALGORITHM, nonce);
    hmac.update(message);
    hmac.update(metadata.senderId);
    hmac.update(metadata.recipientId);
    hmac.update(metadata.threadId);
    hmac.update(timestamp.toString());
    hmac.update(PROOF_VERSION);
    
    const signature = hmac.digest('hex');
    
    // Generate a deterministic public key from the signature
    const publicKey = createHmac(SIGNATURE_ALGORITHM, signature)
      .update(nonce)
      .digest('hex');
    
    return {
      signature,
      publicKey,
      timestamp
    };
  } catch (error) {
    throw new Error(`Failed to generate proof: ${error.message}`);
  }
}

export async function verifyProof(proof: string): Promise<boolean> {
  try {
    // In a real implementation, this would verify the zero-knowledge proof
    // using cryptographic primitives. For now, we just check if it's a valid hex string
    const isValidHex = /^[0-9a-fA-F]+$/.test(proof);
    return isValidHex && proof.length >= 64; // Minimum 256 bits
  } catch (error) {
    return false;
  }
}

export function validateMessageMetadata(metadata: MessageMetadata): ValidationResult {
  try {
    // Check required fields
    if (!metadata.senderId) {
      return { isValid: false, error: 'Missing senderId' };
    }
    if (!metadata.recipientId) {
      return { isValid: false, error: 'Missing recipientId' };
    }
    if (!metadata.threadId) {
      return { isValid: false, error: 'Missing threadId' };
    }
    if (!metadata.timestamp) {
      return { isValid: false, error: 'Missing timestamp' };
    }
    if (!metadata.type) {
      return { isValid: false, error: 'Missing message type' };
    }
    if (!metadata.status) {
      return { isValid: false, error: 'Missing message status' };
    }

    // Validate timestamp
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const fiveMinutesFromNow = now + 5 * 60 * 1000;
    
    if (metadata.timestamp < fiveMinutesAgo || metadata.timestamp > fiveMinutesFromNow) {
      return { isValid: false, error: 'Invalid timestamp' };
    }

    // Validate types
    if (!['text', 'file', 'image'].includes(metadata.type)) {
      return { isValid: false, error: 'Invalid message type' };
    }
    if (!['sent', 'delivered', 'read'].includes(metadata.status)) {
      return { isValid: false, error: 'Invalid message status' };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: `Validation error: ${error.message}` };
  }
} 