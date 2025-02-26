export interface MPCConfig {
  protocol: 'mascot' | 'semi2k' | 'spdz2k';
  numParties: number;
  threshold: number;
  fieldSize: number;
  securityParameter: number;
  preprocessingBatchSize?: number;
}

export interface MPCParty {
  id: number;
  host: string;
  port: number;
  publicKey?: string;
}

export interface MPCShare {
  value: string;  // Base64 encoded share value
  mac?: string;   // Base64 encoded MAC (for MASCOT protocol)
  index: number;  // Share index
}

export interface MPCResult {
  value: string;  // Base64 encoded result
  proof?: string; // Optional zero-knowledge proof
}

export interface MPCMessage {
  type: MPCMessageType;
  payload: any;
  sender: number;
  receiver?: number;
  sessionId: string;
  timestamp: number;
}

export enum MPCMessageType {
  SHARE = 'share',
  RECONSTRUCT = 'reconstruct',
  MULTIPLY = 'multiply',
  COMPARE = 'compare',
  SYNC = 'sync',
  HEARTBEAT = 'heartbeat',
  ERROR = 'error'
}

export interface MPCError extends Error {
  code: MPCErrorCode;
  details?: any;
}

export enum MPCErrorCode {
  PROTOCOL_ERROR = 'protocol_error',
  NETWORK_ERROR = 'network_error',
  CRYPTO_ERROR = 'crypto_error',
  INVALID_SHARE = 'invalid_share',
  TIMEOUT = 'timeout',
  PARTY_FAILURE = 'party_failure'
}

export interface MPCProtocolHandler {
  initialize(config: MPCConfig): Promise<void>;
  connect(parties: MPCParty[]): Promise<void>;
  disconnect(): Promise<void>;
  share(value: string): Promise<MPCShare[]>;
  reconstruct(shares: MPCShare[]): Promise<MPCResult>;
  multiply(a: MPCShare, b: MPCShare): Promise<MPCShare>;
  compare(a: MPCShare, b: MPCShare): Promise<MPCShare>;
  handleMessage(message: MPCMessage): Promise<void>;
}

export interface PreprocessingManager {
  generateTriples(count: number): Promise<void>;
  generateBits(count: number): Promise<void>;
  getTriple(): Promise<[MPCShare, MPCShare, MPCShare]>;
  getBit(): Promise<MPCShare>;
  cleanup(): Promise<void>;
} 