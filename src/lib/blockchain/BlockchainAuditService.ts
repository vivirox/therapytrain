import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import { MerkleTree, MerkleProof } from './MerkleTree';
import { ZKOperation } from '../../services/zkService';

interface Block {
  index: number;
  timestamp: number;
  operations: ZKOperation[];
  merkleRoot: string;
  previousHash: string;
  nonce: number;
  hash: string;
  merkleTree?: MerkleTree;
}

interface AuditBlock extends Block {
  merkleProofs: MerkleProof[];
}

export class BlockchainAuditService {
  private static instance: BlockchainAuditService;
  private chain: Block[];
  private pendingOperations: ZKOperation[];
  private merkleTree: MerkleTree;
  private maxBlockSize: number;
  private readonly difficulty: number = process.env.NODE_ENV === 'test' ? 1 : 4; // Reduce difficulty in test environment
  private eventEmitter: EventEmitter;

  private constructor() {
    this.chain = [];
    this.pendingOperations = [];
    this.merkleTree = new MerkleTree();
    this.maxBlockSize = 100;
    this.eventEmitter = new EventEmitter();

    // Create genesis block with a placeholder operation
    const genesisOperation: ZKOperation = {
      id: 'genesis',
      type: 'GENESIS',
      timestamp: new Date(),
      userId: 'system',
      sessionId: 'genesis',
      status: 'SUCCESS',
      details: {},
      duration: 0
    };

    const genesisMerkleTree = new MerkleTree();
    genesisMerkleTree.addLeaf(JSON.stringify(genesisOperation));

    const genesisBlock: Block = {
      index: 0,
      timestamp: Date.now(),
      operations: [genesisOperation],
      merkleRoot: genesisMerkleTree.getRoot(),
      previousHash: '0',
      nonce: 0,
      hash: '',
      merkleTree: genesisMerkleTree
    };
    genesisBlock.hash = this.calculateHash(genesisBlock);
    this.chain.push(genesisBlock);
  }

  public static getInstance(): BlockchainAuditService {
    if (!BlockchainAuditService.instance) {
      BlockchainAuditService.instance = new BlockchainAuditService();
    }
    return BlockchainAuditService.instance;
  }

  /**
   * Add a new audit operation to the pending pool
   */
  public async addOperation(operation: ZKOperation): Promise<void> {
    this.pendingOperations.push(operation);
    this.merkleTree.addLeaf(JSON.stringify(operation));

    if (this.pendingOperations.length >= this.maxBlockSize) {
      await this.mineBlock();
    }
  }

  /**
   * Get audit proof for a specific operation
   */
  public getAuditProof(operationId: string): MerkleProof | null {
    // First check pending operations
    const pendingIndex = this.pendingOperations.findIndex(op => op.id === operationId);
    if (pendingIndex !== -1) {
      return this.merkleTree.generateProof(pendingIndex);
    }

    // Then check mined blocks
    for (const block of this.chain) {
      const operationIndex = block.operations.findIndex(op => op.id === operationId);
      if (operationIndex !== -1) {
        // Use cached merkle tree if available
        if (!block.merkleTree) {
          block.merkleTree = new MerkleTree();
          block.operations.forEach(op => 
            block.merkleTree!.addLeaf(JSON.stringify(op))
          );
        }
        
        const proof = block.merkleTree.generateProof(operationIndex);
        const operationHash = this.hashOperation(block.operations[operationIndex]);
        
        if (proof.leaf === operationHash) {
          return proof;
        }
      }
    }

    return null;
  }

  /**
   * Verify the entire blockchain
   */
  public verifyChain(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Verify block hash
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }

      // Verify block hash meets difficulty requirement
      if (!this.isValidProofOfWork(currentBlock.hash)) {
        return false;
      }

      // Verify merkle root
      if (!currentBlock.merkleTree) {
        currentBlock.merkleTree = new MerkleTree();
        currentBlock.operations.forEach(op => 
          currentBlock.merkleTree!.addLeaf(JSON.stringify(op))
        );
      }

      if (currentBlock.merkleTree.getRoot() !== currentBlock.merkleRoot) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get the latest block
   */
  public getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Subscribe to blockchain events
   */
  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  private emit(event: string, data: any): void {
    this.eventEmitter.emit(event, data);
  }

  /**
   * Force mining of the current block
   */
  public async mineBlock(): Promise<void> {
    if (this.pendingOperations.length === 0) {
      return;
    }

    // Create and cache the Merkle tree for this block
    const blockMerkleTree = new MerkleTree();
    this.pendingOperations.forEach(op => 
      blockMerkleTree.addLeaf(JSON.stringify(op))
    );

    const block: Block = {
      index: this.chain.length,
      timestamp: Date.now(),
      operations: [...this.pendingOperations],
      merkleRoot: blockMerkleTree.getRoot(),
      previousHash: this.chain[this.chain.length - 1].hash,
      nonce: 0,
      hash: '',
      merkleTree: blockMerkleTree
    };

    // Find proof of work
    while (!this.isValidProofOfWork(block.hash)) {
      block.nonce++;
      block.hash = this.calculateHash(block);
    }

    // Add block to chain
    this.chain.push(block);

    // Generate proofs using the cached Merkle tree
    const merkleProofs = this.pendingOperations.map((op, index) => {
      const proof = blockMerkleTree.generateProof(index);
      const operationHash = this.hashOperation(op);
      
      if (proof.leaf !== operationHash) {
        console.error(`Invalid Merkle proof generated for operation ${op.id}`);
      }
      return proof;
    });

    // Clear pending operations and reset Merkle tree
    this.pendingOperations = [];
    this.merkleTree = new MerkleTree();

    // Emit block mined event with proofs
    this.emit('blockMined', { ...block, merkleProofs });
  }

  /**
   * Calculate hash of a block
   */
  private calculateHash(block: Omit<Block, 'hash'>): string {
    const data = JSON.stringify({
      index: block.index,
      timestamp: block.timestamp,
      operations: block.operations,
      merkleRoot: block.merkleRoot,
      previousHash: block.previousHash,
      nonce: block.nonce
    });

    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Check if a hash meets the difficulty requirement
   */
  private isValidProofOfWork(hash: string): boolean {
    return hash.substring(0, this.difficulty) === '0'.repeat(this.difficulty);
  }

  private hashOperation(operation: ZKOperation): string {
    // Implement the logic to hash an operation
    return createHash('sha256').update(JSON.stringify(operation)).digest('hex');
  }
} 