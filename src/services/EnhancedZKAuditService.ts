import { SecurityAuditService } from './SecurityAuditService';
import { BlockchainAuditService } from '../lib/blockchain/BlockchainAuditService';
import { ZKOperation } from './zkService';
import { MerkleTree, MerkleProof } from '../lib/blockchain/MerkleTree';
import * as Sentry from '@sentry/nextjs';

interface EnhancedAuditRecord {
  operation: ZKOperation;
  blockchainProof?: MerkleProof;
  timestamp: Date;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
}

export class EnhancedZKAuditService {
  private static instance: EnhancedZKAuditService;
  private securityAudit: SecurityAuditService;
  private blockchainAudit: BlockchainAuditService;
  private auditRecords: Map<string, EnhancedAuditRecord>;

  private constructor() {
    this.securityAudit = SecurityAuditService.getInstance();
    this.blockchainAudit = BlockchainAuditService.getInstance();
    this.auditRecords = new Map();

    this.setupBlockchainListeners();
  }

  public static getInstance(): EnhancedZKAuditService {
    if (!EnhancedZKAuditService.instance) {
      EnhancedZKAuditService.instance = new EnhancedZKAuditService();
    }
    return EnhancedZKAuditService.instance;
  }

  /**
   * Record a new ZK operation with enhanced audit trail
   */
  public async recordOperation(operation: ZKOperation): Promise<void> {
    try {
      // Record in traditional audit system
      await this.securityAudit.logOperation(operation);

      // Add to blockchain audit trail
      await this.blockchainAudit.addOperation(operation);

      // Store in local audit records
      this.auditRecords.set(operation.id, {
        operation,
        timestamp: new Date(),
        verificationStatus: 'PENDING'
      });

    } catch (error) {
      console.error('Error recording operation:', error);
      Sentry.captureException(error, {
        tags: {
          operation_type: operation.type,
          operation_id: operation.id
        }
      });
      throw error;
    }
  }

  /**
   * Verify the audit trail for a specific operation
   */
  public async verifyOperation(operationId: string): Promise<boolean> {
    const record = this.auditRecords.get(operationId);
    if (!record) {
      throw new Error('Operation not found in audit trail');
    }

    try {
      // Get blockchain proof
      const proof = this.blockchainAudit.getAuditProof(operationId);
      if (!proof) {
        record.verificationStatus = 'FAILED';
        return false;
      }

      // Update record with proof
      record.blockchainProof = proof;

      // Verify the proof
      const isValid = await this.verifyProof(record);
      record.verificationStatus = isValid ? 'VERIFIED' : 'FAILED';

      return isValid;
    } catch (error) {
      console.error('Error verifying operation:', error);
      Sentry.captureException(error, {
        tags: {
          operation_id: operationId
        }
      });
      record.verificationStatus = 'FAILED';
      return false;
    }
  }

  /**
   * Get the complete audit trail for an operation
   */
  public getAuditTrail(operationId: string): EnhancedAuditRecord | null {
    return this.auditRecords.get(operationId) || null;
  }

  /**
   * Verify all operations in the audit trail
   */
  public async verifyAllOperations(): Promise<boolean> {
    try {
      console.log('Starting verifyAllOperations');
      console.log('Number of records:', this.auditRecords.size);

      // Force mining of any pending operations
      await this.blockchainAudit.mineBlock();
      console.log('Block mined');

      // Verify blockchain integrity
      const isChainValid = this.blockchainAudit.verifyChain();
      console.log('Chain validity:', isChainValid);
      if (!isChainValid) {
        throw new Error('Blockchain integrity check failed');
      }

      // Wait for block mining event to be processed
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('After waiting for block mining event');

      // Verify each operation with retries
      const verificationPromises = Array.from(this.auditRecords.entries())
        .map(async ([operationId, record]) => {
          console.log('Verifying operation:', operationId, 'Status:', record.verificationStatus);
          
          // Try verification up to 3 times
          for (let attempt = 1; attempt <= 3; attempt++) {
            if (record.verificationStatus === 'PENDING' || (attempt > 1 && record.verificationStatus === 'FAILED')) {
              console.log(`Verification attempt ${attempt} for operation:`, operationId);
              const isValid = await this.verifyOperation(operationId);
              record.verificationStatus = isValid ? 'VERIFIED' : 'FAILED';
              
              if (isValid) {
                console.log('Operation verified successfully:', operationId);
                return true;
              }
              
              // If not the last attempt, wait before retrying
              if (attempt < 3) {
                await new Promise(resolve => setTimeout(resolve, 100 * attempt));
                await this.blockchainAudit.mineBlock();
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            } else {
              console.log('Operation already verified:', operationId, 'Status:', record.verificationStatus);
              return record.verificationStatus === 'VERIFIED';
            }
          }
          
          return record.verificationStatus === 'VERIFIED';
        });

      const results = await Promise.all(verificationPromises);
      console.log('Verification results:', results);
      return results.every(result => result);

    } catch (error) {
      console.error('Error verifying all operations:', error);
      Sentry.captureException(error, {
        tags: {
          verification_stage: 'verify_all_operations'
        }
      });
      return false;
    }
  }

  /**
   * Set up blockchain event listeners
   */
  private setupBlockchainListeners(): void {
    this.blockchainAudit.on('blockMined', async (block) => {
      try {
        // Update verification status for operations in the block
        for (const operation of block.operations) {
          const record = this.auditRecords.get(operation.id);
          if (record) {
            const proof = block.merkleProofs.find(p => {
              const operationHash = this.hashOperation(operation);
              return p.leaf === operationHash;
            });
            if (proof) {
              record.blockchainProof = proof;
              record.verificationStatus = await this.verifyProof(record) ? 'VERIFIED' : 'FAILED';
            }
          }
        }
      } catch (error) {
        console.error('Error processing mined block:', error);
        Sentry.captureException(error);
      }
    });
  }

  /**
   * Verify a single audit record's proof
   */
  private async verifyProof(record: EnhancedAuditRecord): Promise<boolean> {
    try {
      console.log('Verifying proof for operation:', record.operation.id);
      
      // If the operation is still pending (no blockchain proof), try to get it
      if (!record.blockchainProof) {
        const proof = this.blockchainAudit.getAuditProof(record.operation.id);
        console.log('Got proof from blockchain:', !!proof);
        if (!proof) {
          // Operation is still pending, wait for it to be mined
          await this.blockchainAudit.mineBlock();
          
          // Wait a bit for the block mining event to be processed
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Try getting the proof again after mining
          const minedProof = this.blockchainAudit.getAuditProof(record.operation.id);
          if (!minedProof) {
            console.log('No proof available after mining for:', record.operation.id);
            return false;
          }
          record.blockchainProof = minedProof;
        } else {
          record.blockchainProof = proof;
        }
      }

      // Verify the operation hasn't been tampered with
      const operationHash = this.hashOperation(record.operation);
      console.log('Operation hash:', operationHash);
      console.log('Proof leaf:', record.blockchainProof.leaf);
      
      if (operationHash !== record.blockchainProof.leaf) {
        console.log('Hash mismatch - operation tampered');
        return false;
      }

      // Verify the Merkle proof
      const isValid = MerkleTree.verifyProof(record.blockchainProof);
      console.log('Merkle proof verification:', isValid);
      
      if (!isValid) {
        console.log('Invalid Merkle proof for operation:', record.operation.id);
        console.log('Proof:', JSON.stringify(record.blockchainProof, null, 2));
        
        // If verification fails, try mining a new block and verifying again
        await this.blockchainAudit.mineBlock();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const newProof = this.blockchainAudit.getAuditProof(record.operation.id);
        if (newProof) {
          record.blockchainProof = newProof;
          const retryValid = MerkleTree.verifyProof(newProof);
          console.log('Retry verification result:', retryValid);
          return retryValid;
        }
      }
      
      return isValid;
    } catch (error) {
      console.error('Error verifying proof:', error);
      Sentry.captureException(error, {
        tags: {
          operation_id: record.operation.id,
          verification_stage: 'proof_verification'
        },
        extra: {
          operation: record.operation,
          proof: record.blockchainProof
        }
      });
      return false;
    }
  }

  /**
   * Hash an operation consistently
   */
  private hashOperation(operation: ZKOperation): string {
    const merkleTree = new MerkleTree();
    merkleTree.addLeaf(JSON.stringify(operation));
    return merkleTree.getRoot();
  }
} 