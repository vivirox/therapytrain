import { BlockchainAuditService } from '../lib/blockchain/BlockchainAuditService';
import { EnhancedZKAuditService } from '../services/EnhancedZKAuditService';
import { MerkleTree } from '../lib/blockchain/MerkleTree';
import { ZKOperation } from '../services/zkService';

describe('Blockchain Audit Trail', () => {
  let blockchainAudit: BlockchainAuditService;
  let enhancedAudit: EnhancedZKAuditService;

  beforeEach(() => {
    // Reset singleton instances
    (BlockchainAuditService as any).instance = null;
    (EnhancedZKAuditService as any).instance = null;

    blockchainAudit = BlockchainAuditService.getInstance();
    enhancedAudit = EnhancedZKAuditService.getInstance();
  });

  afterEach(() => {
    // Clean up singleton instances
    (BlockchainAuditService as any).instance = null;
    (EnhancedZKAuditService as any).instance = null;
  });

  describe('MerkleTree', () => {
    let merkleTree: MerkleTree;

    beforeEach(() => {
      merkleTree = new MerkleTree();
    });

    it('should generate valid Merkle proofs', () => {
      const data = ['operation1', 'operation2', 'operation3', 'operation4'];
      data.forEach(item => merkleTree.addLeaf(item));

      const proof = merkleTree.generateProof(1); // Get proof for 'operation2'
      expect(proof).toBeDefined();
      expect(proof.leaf).toBeDefined();
      expect(proof.proof.length).toBeGreaterThan(0);
      
      const isValid = MerkleTree.verifyProof(proof);
      expect(isValid).toBe(true);
    });

    it('should detect invalid Merkle proofs', () => {
      const data = ['operation1', 'operation2', 'operation3', 'operation4'];
      data.forEach(item => merkleTree.addLeaf(item));

      const proof = merkleTree.generateProof(1);
      // Tamper with the proof
      proof.leaf = 'tampered_operation';

      const isValid = MerkleTree.verifyProof(proof);
      expect(isValid).toBe(false);
    });
  });

  describe('BlockchainAuditService', () => {
    const createTestOperation = (id: string): ZKOperation => ({
      id,
      type: 'PROOF_GENERATION',
      timestamp: new Date(),
      userId: 'test-user',
      sessionId: 'test-session',
      status: 'SUCCESS',
      details: {},
      duration: 100
    });

    it('should add operations and mine blocks', async () => {
      const operation = createTestOperation('test-op-1');
      await blockchainAudit.addOperation(operation);

      const proof = blockchainAudit.getAuditProof(operation.id);
      expect(proof).toBeDefined();
      expect(proof?.leaf).toBeDefined();
    });

    it('should maintain blockchain integrity', async () => {
      // Add multiple operations
      const operations = Array.from({ length: 5 }, (_, i) => 
        createTestOperation(`test-op-${i}`)
      );

      for (const operation of operations) {
        await blockchainAudit.addOperation(operation);
      }

      const isValid = blockchainAudit.verifyChain();
      expect(isValid).toBe(true);
    });

    it('should detect tampering', async () => {
      const operation = createTestOperation('test-op-2');
      await blockchainAudit.addOperation(operation);

      // Force mining of current block
      for (let i = 0; i < 99; i++) {
        await blockchainAudit.addOperation(createTestOperation(`filler-${i}`));
      }

      const proof = blockchainAudit.getAuditProof(operation.id);
      expect(proof).toBeDefined();

      if (proof) {
        // Tamper with the proof
        proof.leaf = JSON.stringify({ ...operation, status: 'FAILED' });
        const isValid = MerkleTree.verifyProof(proof);
        expect(isValid).toBe(false);
      }
    });
  });

  describe('EnhancedZKAuditService', () => {
    const createTestOperation = (id: string): ZKOperation => ({
      id,
      type: 'PROOF_GENERATION',
      timestamp: new Date(),
      userId: 'test-user',
      sessionId: 'test-session',
      status: 'SUCCESS',
      details: {},
      duration: 100
    });

    it('should record operations with blockchain proofs', async () => {
      const operation = createTestOperation('test-op-3');
      await enhancedAudit.recordOperation(operation);

      const auditTrail = enhancedAudit.getAuditTrail(operation.id);
      expect(auditTrail).toBeDefined();
      expect(auditTrail?.operation).toEqual(operation);
    });

    it('should verify individual operations', async () => {
      const operation = createTestOperation('test-op-4');
      await enhancedAudit.recordOperation(operation);

      // Force mining of the block
      await blockchainAudit.mineBlock();

      // Wait for block mining event to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      const isValid = await enhancedAudit.verifyOperation(operation.id);
      expect(isValid).toBe(true);
    });

    it('should verify all operations', async () => {
      const operations = Array.from({ length: 3 }, (_, i) => 
        createTestOperation(`batch-op-${i}`)
      );

      for (const operation of operations) {
        await enhancedAudit.recordOperation(operation);
      }

      // Force mining of the block
      await blockchainAudit.mineBlock();

      // Wait for block mining event to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      const allValid = await enhancedAudit.verifyAllOperations();
      expect(allValid).toBe(true);
    });

    it('should detect tampered operations', async () => {
      const operation = createTestOperation('test-op-5');
      await enhancedAudit.recordOperation(operation);

      // Simulate tampering by creating a new operation with same ID but different data
      const tamperedOperation = {
        ...operation,
        status: 'FAILED',
        details: { tampered: true }
      };

      const auditTrail = enhancedAudit.getAuditTrail(operation.id);
      if (auditTrail) {
        auditTrail.operation = tamperedOperation;
      }

      const isValid = await enhancedAudit.verifyOperation(operation.id);
      expect(isValid).toBe(false);
    });

    it('should handle concurrent operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => 
        createTestOperation(`concurrent-op-${i}`)
      );

      // Record operations concurrently
      await Promise.all(
        operations.map(op => enhancedAudit.recordOperation(op))
      );

      // Force mining of the block
      await blockchainAudit.mineBlock();

      // Wait for block mining event to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify all operations were recorded
      for (const operation of operations) {
        const auditTrail = enhancedAudit.getAuditTrail(operation.id);
        expect(auditTrail).toBeDefined();
        expect(auditTrail?.operation).toEqual(operation);
      }

      // Verify integrity of untampered operations
      const allValid = await enhancedAudit.verifyAllOperations();
      expect(allValid).toBe(true);

      // Tamper with an operation
      const tamperedOperation = operations[5];
      const auditTrail = enhancedAudit.getAuditTrail(tamperedOperation.id);
      if (auditTrail) {
        auditTrail.operation = {
          ...tamperedOperation,
          status: 'FAILED',
          details: { tampered: true }
        };
      }

      // Verify that tampered operation is detected
      const isValid = await enhancedAudit.verifyOperation(tamperedOperation.id);
      expect(isValid).toBe(false);

      // Verify that overall verification fails due to tampered operation
      const finalVerification = await enhancedAudit.verifyAllOperations();
      expect(finalVerification).toBe(false);
    });
  });
}); 