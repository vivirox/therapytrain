import { Message } from 'ai'

export interface ZKMessage extends Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  proof?: ZKProof
  metadata?: MessageMetadata
}

export interface SecureMessage extends Message {
  encryptedContent: string
  proof: ZKProof
  metadata: MessageMetadata
}

export interface ZKProof {
  proof: Uint8Array
  publicInputs: Uint8Array[]
}

export interface MessageMetadata {
  timestamp: number
  sender: string
  recipient: string
  messageType: 'text' | 'file' | 'image'
  encryptionVersion: string
}

export interface KeyPair {
  publicKey: Uint8Array
  privateKey: Uint8Array
}

export interface EncryptionContext {
  keyPair: KeyPair
  sharedSecret?: Uint8Array
}

export interface ValidationResult {
  isValid: boolean
  error?: string
}

// Circuit types for message validation
export interface MessageCircuit {
  message: SecureMessage
  proof: ZKProof
  validate(): Promise<ValidationResult>
}

// Types for the secure chat system
export interface SecureChatConfig {
  encryptionVersion: string
  circuitPath: string
  proofSystem: 'groth16' | 'plonk'
}

export interface SecureChatState {
  messages: SecureMessage[]
  keys: {
    [participantId: string]: KeyPair
  }
  activeCircuit?: MessageCircuit
} 