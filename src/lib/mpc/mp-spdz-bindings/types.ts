/**
 * MP-SPDZ TypeScript bindings
 * Provides type-safe interfaces for interacting with MP-SPDZ protocols
 */

import { ChildProcess } from 'child_process';

/**
 * MPC Protocol types
 */
export enum MPCProtocol {
  MASCOT = 'mascot',    // Default secure protocol
  SPDZ2K = 'spdz2k',    // For integer arithmetic
  SEMI2K = 'semi2k'     // Better performance in semi-honest setting
}

/**
 * Error types for MPC operations
 */
export enum MPCErrorType {
  INITIALIZATION_ERROR = 'initialization_error',
  PROTOCOL_ERROR = 'protocol_error',
  COMPUTATION_ERROR = 'computation_error',
  NETWORK_ERROR = 'network_error',
  SECURITY_ERROR = 'security_error'
}

/**
 * Configuration for MP-SPDZ computation
 */
export interface MPCConfig {
  protocol: MPCProtocol;
  numParties: number;
  threshold?: number;    // Number of corrupt parties that can be tolerated
  prime?: bigint;       // Prime field size for arithmetic
  preprocessingDir?: string;   // Directory for preprocessing data
  networkConfig?: {
    retryDelay?: number;
    heartbeatInterval?: number;
  };
}

/**
 * Represents a party in the MPC computation
 */
export interface MPCParty {
  id: number;
  host: string;
  port: number;
  process?: ChildProcess;
  status?: PartyStatus;
  lastHeartbeat?: number;
}

/**
 * Party status
 */
export enum PartyStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  READY = 'ready',
  FAILED = 'failed'
}

/**
 * Share metadata
 */
export interface ShareMetadata {
  type: string;
  field?: bigint;
  bitLength?: number;
  verified?: boolean;
}

/**
 * Represents a secret share in the MPC protocol
 */
export interface MPCShare {
  id: string;           // Unique identifier for this share
  partyId: number;      // ID of the party holding this share
  value: Uint8Array;    // The actual share value (encoded)
  metadata?: ShareMetadata;
}

/**
 * Proof data for verification
 */
export interface ProofData {
  type: string;
  data: Uint8Array;
}

/**
 * Result of opening a secret share
 */
export interface MPCResult<T> {
  value: T;             // The opened value
  proof?: ProofData;    // Optional zero-knowledge proof
  metadata?: {          // Additional metadata about the result
    field?: bigint;     // Field size if arithmetic
    bitLength?: number; // Bit length if binary
    verified?: boolean; // Whether the result was verified
  };
}

/**
 * MPC Error class
 */
export class MPCError extends Error {
  constructor(
    public readonly type: MPCErrorType,
    message: string,
    public readonly cause?: any
  ) {
    super(message);
    this.name = 'MPCError';
  }
}

/**
 * Network message metadata
 */
export interface MessageMetadata {
  timestamp: number;
  sequence: number;
  sessionId: string;
}

/**
 * Network message proof
 */
export interface MessageProof {
  type: string;
  data: Uint8Array;
  signature: string;
}

/**
 * Network message
 */
export interface NetworkMessage<T = any> {
  type: string;
  sender: number;
  receiver?: number;
  data: T;
  metadata: MessageMetadata;
  proof?: MessageProof;
}

/**
 * Network event types
 */
export enum NetworkEventType {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  MESSAGE = 'message',
  ERROR = 'error',
  SYNC = 'sync',
  HEARTBEAT = 'heartbeat'
}

/**
 * Network event
 */
export interface NetworkEvent<T = any> {
  type: NetworkEventType;
  partyId: number;
  data?: T;
  timestamp: number;
  error?: Error;
} 