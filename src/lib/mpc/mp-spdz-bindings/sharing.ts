import { MPCParty, MPCShare, MPCError, MPCErrorType } from './types';
import { ValueEncoder } from './encoding';

/**
 * Configuration for share distribution
 */
interface SharingConfig {
  threshold: number;
  parties: Map<number, MPCParty>;
  encoder: ValueEncoder;
}

/**
 * Handles share distribution and reconstruction
 */
export class ShareDistributor {
  constructor(private readonly config: SharingConfig) {}

  /**
   * Distribute a value into shares
   */
  public async distribute(value: number[] | bigint[], receivers?: number[]): Promise<MPCShare[]> {
    const targetParties = receivers || Array.from(this.config.parties.keys());
    
    if (targetParties.length < this.config.threshold) {
      throw new MPCError(
        MPCErrorType.PROTOCOL_ERROR,
        `Number of receivers (${targetParties.length}) is less than threshold (${this.config.threshold})`
      );
    }

    try {
      // Encode the value
      const encoded = this.config.encoder.encode(value);

      // Generate random shares that sum to the encoded value
      const shares = await this.generateShares(encoded, targetParties.length);

      // Create MPCShare objects for each party
      return targetParties.map((partyId, index) => ({
        id: this.generateShareId(),
        partyId,
        value: shares[index],
        metadata: {
          type: 'arithmetic',
          field: this.config.encoder['config'].prime,
          bitLength: this.config.encoder['config'].bitLength
        }
      }));
    } catch (error) {
      throw new MPCError(
        MPCErrorType.COMPUTATION_ERROR,
        'Failed to distribute shares',
        error
      );
    }
  }

  /**
   * Reconstruct a value from shares
   */
  public async reconstruct<T>(shares: MPCShare[]): Promise<T> {
    if (shares.length < this.config.threshold) {
      throw new MPCError(
        MPCErrorType.PROTOCOL_ERROR,
        `Not enough shares (${shares.length}) to reconstruct value (threshold: ${this.config.threshold})`
      );
    }

    try {
      // Combine shares
      const combined = await this.combineShares(shares.map(s => s.value));
      
      // Decode the combined value
      return this.config.encoder.decode<T>(combined);
    } catch (error) {
      throw new MPCError(
        MPCErrorType.COMPUTATION_ERROR,
        'Failed to reconstruct value',
        error
      );
    }
  }

  /**
   * Generate random shares that sum to the target value
   */
  private async generateShares(value: Uint8Array, numShares: number): Promise<Uint8Array[]> {
    const shares: Uint8Array[] = [];
    const valueLength = value.length;

    // Generate random shares for all but the last party
    for (let i = 0; i < numShares - 1; i++) {
      shares.push(await this.generateRandomShare(valueLength));
    }

    // Calculate the last share as the difference between the value and sum of other shares
    const lastShare = new Uint8Array(valueLength);
    const valueView = new DataView(value.buffer);
    const shareViews = shares.map(s => new DataView(s.buffer));
    
    for (let i = 0; i < valueLength; i++) {
      let sum = 0;
      for (const view of shareViews) {
        sum = (sum + view.getUint8(i)) % 256;
      }
      lastShare[i] = (valueView.getUint8(i) - sum + 256) % 256;
    }
    
    shares.push(lastShare);
    return shares;
  }

  /**
   * Combine shares to reconstruct the original value
   */
  private async combineShares(shares: Uint8Array[]): Promise<Uint8Array> {
    const valueLength = shares[0].length;
    const result = new Uint8Array(valueLength);
    const resultView = new DataView(result.buffer);
    const shareViews = shares.map(s => new DataView(s.buffer));

    for (let i = 0; i < valueLength; i++) {
      let sum = 0;
      for (const view of shareViews) {
        sum = (sum + view.getUint8(i)) % 256;
      }
      resultView.setUint8(i, sum);
    }

    return result;
  }

  /**
   * Generate a random share of specified length
   */
  private async generateRandomShare(length: number): Promise<Uint8Array> {
    const share = new Uint8Array(length);
    const view = new DataView(share.buffer);
    
    // Use crypto.getRandomValues for secure randomness
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(share);
    } else {
      // Fallback to Node.js crypto module
      const { randomBytes } = await import('crypto');
      const randomBuffer = randomBytes(length);
      for (let i = 0; i < length; i++) {
        view.setUint8(i, randomBuffer[i]);
      }
    }
    
    return share;
  }

  private generateShareId(): string {
    return `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 