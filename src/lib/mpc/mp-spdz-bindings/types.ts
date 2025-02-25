/**
 * MP-SPDZ TypeScript bindings
 * Provides type-safe interfaces for interacting with MP-SPDZ protocols
 */

export interface MPCConfig {
  /** Number of parties involved in the computation */
  partyCount: number;
  
  /** Minimum number of honest parties required (threshold) */
  threshold: number;
  
  /** Prime field size for arithmetic operations */
  fieldSize?: bigint;
  
  /** Protocol to use (e.g. 'mascot', 'spdz2k', etc.) */
  protocol: MPCProtocol;
  
  /** Security parameter (k in bits) */
  securityParameter?: number;
  
  /** Optional protocol-specific parameters */
  protocolParams?: Record<string, unknown>;
}

export enum MPCProtocol {
  /** MASCOT protocol - malicious security with dishonest majority */
  MASCOT = 'mascot',
  
  /** SPDZ2k protocol - malicious security in Z2k */
  SPDZ2k = 'spdz2k',
  
  /** Semi2k protocol - semi-honest security in Z2k */
  SEMI2k = 'semi2k',
  
  /** Tiny protocol - malicious security for binary circuits */
  TINY = 'tiny'
}

export interface MPCParty {
  /** Unique party identifier */
  id: number;
  
  /** Party's public key (if using public key infrastructure) */
  publicKey?: string;
  
  /** Connection status */
  connected: boolean;
  
  /** Whether party is ready for computation */
  ready: boolean;
}

export interface MPCShare {
  /** Share value (as array of field elements) */
  value: bigint[];
  
  /** IDs of parties holding this share */
  holders: number[];
  
  /** Threshold required to reconstruct */
  threshold: number;
  
  /** Field size used for this share (optional) */
  fieldSize?: bigint;
}

export interface MPCResult<T> {
  /** Computed result */
  value: T;
  
  /** Zero-knowledge proof of correctness (if applicable) */
  proof?: Uint8Array;
  
  /** Metadata about the computation */
  metadata: {
    /** Participating parties */
    parties: number[];
    
    /** Timestamp of computation */
    timestamp: string;
    
    /** Unique computation identifier */
    computationId: string;
    
    /** Protocol used */
    protocol: MPCProtocol;
  };
}

export interface MPCError extends Error {
  /** Error code for programmatic handling */
  code: string;
  
  /** Additional error details */
  details?: Record<string, unknown>;
} 