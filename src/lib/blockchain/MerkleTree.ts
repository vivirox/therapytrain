import { createHash } from 'crypto';

export interface MerkleProof {
  root: string;
  proof: string[];
  leaf: string;
  index: number;
}

export class MerkleTree {
  private leaves: string[] = [];
  private layers: string[][] = [];
  private dirty: boolean = true;

  public addLeaf(data: string): void {
    const hash = this.hashData(data);
    this.leaves.push(hash);
    this.dirty = true;
  }

  public getRoot(): string {
    if (this.leaves.length === 0) {
      throw new Error('No leaves in the tree');
    }

    if (this.dirty) {
      this.buildLayers();
    }

    return this.layers[this.layers.length - 1][0];
  }

  public generateProof(index: number): MerkleProof {
    if (this.leaves.length === 0) {
      throw new Error('No leaves in the tree');
    }

    if (index < 0 || index >= this.leaves.length) {
      throw new Error('Index out of bounds');
    }

    if (this.dirty) {
      this.buildLayers();
    }

    const proof: string[] = [];
    let currentIndex = index;

    // Start from the bottom layer (leaves)
    for (let layerIndex = 0; layerIndex < this.layers.length - 1; layerIndex++) {
      const currentLayer = this.layers[layerIndex];
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

      if (siblingIndex < currentLayer.length) {
        proof.push(currentLayer[siblingIndex]);
      } else if (layerIndex < this.layers.length - 1) {
        // If no sibling exists, use the current node as its own sibling
        proof.push(currentLayer[currentIndex]);
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      root: this.getRoot(),
      proof,
      leaf: this.leaves[index],
      index
    };
  }

  public static verifyProof(proof: MerkleProof): boolean {
    if (!proof || !proof.proof || !proof.leaf || !proof.root) {
      console.error('Invalid proof structure');
      return false;
    }

    try {
      let currentHash = proof.leaf;
      let currentIndex = proof.index;

      for (const sibling of proof.proof) {
        const isRightNode = currentIndex % 2 === 1;
        const [left, right] = isRightNode ? [sibling, currentHash] : [currentHash, sibling];
        currentHash = MerkleTree.hashPair(left, right);
        currentIndex = Math.floor(currentIndex / 2);
      }

      return currentHash === proof.root;
    } catch (error) {
      console.error('Error verifying Merkle proof:', error);
      return false;
    }
  }

  private buildLayers(): void {
    if (this.leaves.length === 0) {
      throw new Error('No leaves in the tree');
    }

    this.layers = [this.leaves];
    
    while (this.layers[this.layers.length - 1].length > 1) {
      const currentLayer = this.layers[this.layers.length - 1];
      const nextLayer: string[] = [];

      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left;
        nextLayer.push(MerkleTree.hashPair(left, right));
      }

      this.layers.push(nextLayer);
    }

    this.dirty = false;
  }

  private hashData(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  private static hashPair(left: string, right: string): string {
    return createHash('sha256')
      .update(left + right)
      .digest('hex');
  }
} 