export interface ZKOperation {
  id: string;
  type: string;
  timestamp: Date;
  userId: string;
  sessionId: string;
  status: string;
  details: Record<string, any>;
  duration: number;
}

export interface OperationRecord {
  operation: ZKOperation;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
}

export interface MerkleProof {
  root: string;
  proof: string[];
  leaf: string;
  index: number;
} 