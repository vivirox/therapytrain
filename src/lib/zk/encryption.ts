/// <reference types="node" />
import { KeyPair, SecureMessage, ZKProof, ValidationResult, MessageMetadata } from './types'
import { generateProof, verifyProof } from './validation'

// Constants
const ENCRYPTION_VERSION = '1.0.0'
const CIRCUIT_PATH = '/circuits/message.zk'

// Key generation
export async function generateKeyPair(): Promise<KeyPair> {
  // Generate a new key pair using the Nexus SDK
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    ['deriveKey', 'deriveBits']
  )

  // Export the keys as raw bytes
  const publicKey = await window.crypto.subtle.exportKey('raw', keyPair.publicKey)
  const privateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey)

  return {
    publicKey: new Uint8Array(publicKey),
    privateKey: new Uint8Array(privateKey)
  }
}

// Message encryption
export async function encryptMessage(
  message: string,
  senderKeyPair: KeyPair,
  recipientPublicKey: Uint8Array,
  metadata: Partial<MessageMetadata>
): Promise<SecureMessage> {
  // Generate shared secret
  const sharedSecret = await deriveSharedSecret(senderKeyPair.privateKey, recipientPublicKey)

  // Encrypt the message content
  const encoder = new TextEncoder()
  const messageBytes = encoder.encode(message)
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  
  const key = await window.crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )

  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    messageBytes
  )

  // Generate ZK proof
  const proof = await generateProof({
    message: messageBytes,
    sharedSecret,
    publicKey: senderKeyPair.publicKey
  })

  // Create the secure message
  const secureMessage: SecureMessage = {
    id: crypto.randomUUID(),
    encryptedContent: Buffer.from(encryptedContent).toString('base64'),
    proof,
    metadata: {
      timestamp: Date.now(),
      sender: Buffer.from(senderKeyPair.publicKey).toString('hex'),
      recipient: Buffer.from(recipientPublicKey).toString('hex'),
      messageType: 'text',
      encryptionVersion: ENCRYPTION_VERSION,
      ...metadata
    },
    role: 'user',
    content: '' // The encrypted content is stored in encryptedContent
  }

  return secureMessage
}

// Message decryption
export async function decryptMessage(
  secureMessage: SecureMessage,
  recipientKeyPair: KeyPair
): Promise<string> {
  // Verify the proof first
  const isValid = await verifyProof(secureMessage.proof)
  if (!isValid) {
    throw new Error('Invalid message proof')
  }

  // Get sender's public key
  const senderPublicKey = Buffer.from(secureMessage.metadata.sender, 'hex')

  // Derive shared secret
  const sharedSecret = await deriveSharedSecret(recipientKeyPair.privateKey, senderPublicKey)

  // Decrypt the content
  const key = await window.crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )

  const encryptedBytes = Buffer.from(secureMessage.encryptedContent, 'base64')
  const iv = encryptedBytes.slice(0, 12)
  const ciphertext = encryptedBytes.slice(12)

  const decryptedBytes = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  const decoder = new TextDecoder()
  return decoder.decode(decryptedBytes)
}

// Helper function to derive shared secret
async function deriveSharedSecret(
  privateKey: Uint8Array,
  publicKey: Uint8Array
): Promise<Uint8Array> {
  const privateKeyObject = await window.crypto.subtle.importKey(
    'pkcs8',
    privateKey,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    false,
    ['deriveBits']
  )

  const publicKeyObject = await window.crypto.subtle.importKey(
    'raw',
    publicKey,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    false,
    []
  )

  const sharedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: publicKeyObject
    },
    privateKeyObject,
    256
  )

  return new Uint8Array(sharedBits)
}

// Utility function to validate a secure message
export async function validateSecureMessage(
  message: SecureMessage
): Promise<ValidationResult> {
  try {
    // Verify the proof
    const isValidProof = await verifyProof(message.proof)
    if (!isValidProof) {
      return { isValid: false, error: 'Invalid proof' }
    }

    // Verify metadata
    if (!message.metadata.timestamp || 
        !message.metadata.sender || 
        !message.metadata.recipient ||
        !message.metadata.messageType ||
        !message.metadata.encryptionVersion) {
      return { isValid: false, error: 'Missing required metadata' }
    }

    // Verify encryption version
    if (message.metadata.encryptionVersion !== ENCRYPTION_VERSION) {
      return { isValid: false, error: 'Unsupported encryption version' }
    }

    return { isValid: true }
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Unknown validation error' 
    }
  }
} 