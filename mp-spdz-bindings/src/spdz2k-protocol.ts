import { spawn } from 'child_process';
import { join } from 'path';
import debug from 'debug';
import {
  MPCShare,
  MPCResult,
  MPCMessage,
  MPCMessageType,
  MPCError,
  MPCErrorCode,
  PreprocessingManager
} from './types';
import { BaseProtocolHandler } from './base-protocol';

const log = debug('mp-spdz:spdz2k');

class SPDZ2kPreprocessingManager implements PreprocessingManager {
  private process: any;
  private dataDir: string;
  private triples: [MPCShare, MPCShare, MPCShare][] = [];
  private bits: MPCShare[] = [];
  private k: number; // Bit length for integer arithmetic

  constructor(private partyId: number, private numParties: number, k: number = 64) {
    this.dataDir = join(process.cwd(), 'Player-Data');
    this.k = k;
  }

  public async generateTriples(count: number): Promise<void> {
    await this.runPreprocessing('triple', count);
  }

  public async generateBits(count: number): Promise<void> {
    await this.runPreprocessing('bit', count);
  }

  public async getTriple(): Promise<[MPCShare, MPCShare, MPCShare]> {
    if (this.triples.length === 0) {
      await this.generateTriples(1000); // Generate batch
    }
    const triple = this.triples.shift();
    if (!triple) {
      throw new Error('No triples available');
    }
    return triple;
  }

  public async getBit(): Promise<MPCShare> {
    if (this.bits.length === 0) {
      await this.generateBits(1000); // Generate batch
    }
    const bit = this.bits.shift();
    if (!bit) {
      throw new Error('No bits available');
    }
    return bit;
  }

  public async cleanup(): Promise<void> {
    if (this.process) {
      this.process.kill();
    }
  }

  private async runPreprocessing(type: string, count: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(
        './spdz2k-party.x',
        [
          '-p', this.partyId.toString(),
          '-N', this.numParties.toString(),
          '-k', this.k.toString(),
          '-T', type,
          '-n', count.toString()
        ],
        { cwd: this.dataDir }
      );

      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        log('Preprocessing error:', data.toString());
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Preprocessing failed with code ${code}`));
          return;
        }

        try {
          this.parsePreprocessingOutput(type, output);
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      this.process = process;
    });
  }

  private parsePreprocessingOutput(type: string, output: string): void {
    const lines = output.split('\n');
    if (type === 'triple') {
      this.triples = lines
        .filter(line => line.startsWith('TRIPLE:'))
        .map(line => {
          const [, a, b, c] = line.split(':');
          return [
            this.createShare(a),
            this.createShare(b),
            this.createShare(c)
          ];
        });
    } else if (type === 'bit') {
      this.bits = lines
        .filter(line => line.startsWith('BIT:'))
        .map(line => {
          const [, value] = line.split(':');
          return this.createShare(value);
        });
    }
  }

  private createShare(value: string): MPCShare {
    // Ensure the value fits within k bits
    const intValue = BigInt(`0x${value}`);
    const mask = (1n << BigInt(this.k)) - 1n;
    const truncatedValue = intValue & mask;

    return {
      value: truncatedValue.toString(16),
      index: this.partyId,
      mac: this.computeMAC(truncatedValue.toString(16))
    };
  }

  private computeMAC(value: string): string {
    // Compute MAC for k-bit value using SPDZ2k MAC scheme
    const intValue = BigInt(`0x${value}`);
    const mask = (1n << BigInt(this.k)) - 1n;
    const macKey = this.generateMACKey();
    return ((intValue * macKey) & mask).toString(16);
  }

  private generateMACKey(): bigint {
    // Generate random MAC key for k-bit field
    const bytes = crypto.randomBytes(Math.ceil(this.k / 8));
    const key = BigInt(`0x${bytes.toString('hex')}`);
    const mask = (1n << BigInt(this.k)) - 1n;
    return key & mask;
  }
}

export class SPDZ2kProtocolHandler extends BaseProtocolHandler {
  private k: number; // Bit length for integer arithmetic

  constructor(config: MPCConfig) {
    super(config);
    this.k = config.bitLength || 64;
  }

  protected async setupPreprocessing(): Promise<void> {
    this.preprocessingManager = new SPDZ2kPreprocessingManager(
      this.partyId,
      this.config.numParties,
      this.k
    );
    await this.preprocessingManager.generateTriples(this.config.preprocessingBatchSize || 1000);
    await this.preprocessingManager.generateBits(this.config.preprocessingBatchSize || 1000);
  }

  public async share(value: string): Promise<MPCShare[]> {
    // Convert value to k-bit integer
    const intValue = BigInt(value);
    const mask = (1n << BigInt(this.k)) - 1n;
    const truncatedValue = intValue & mask;
    
    // Generate random shares that sum to the truncated value
    const shares: MPCShare[] = [];
    let remainingValue = truncatedValue;
    
    // Generate n-1 random shares
    for (let i = 0; i < this.config.numParties - 1; i++) {
      const randomShare = this.generateRandomKBitValue();
      remainingValue = (remainingValue - randomShare + (1n << BigInt(this.k))) & mask;
      
      shares.push({
        value: randomShare.toString(16),
        index: i,
        mac: this.computeMAC(randomShare.toString(16))
      });
    }
    
    // Last share is the remaining value
    shares.push({
      value: remainingValue.toString(16),
      index: this.config.numParties - 1,
      mac: this.computeMAC(remainingValue.toString(16))
    });
    
    // Distribute shares to parties
    await Promise.all(shares.map(async (share, i) => {
      if (i !== this.partyId) {
        await this.sendMessage({
          type: MPCMessageType.SHARE,
          payload: share,
          sender: this.partyId,
          receiver: i,
          sessionId: this.sessionId,
          timestamp: Date.now()
        });
      }
    }));
    
    return shares;
  }

  public async reconstruct(shares: MPCShare[]): Promise<MPCResult> {
    // Verify MACs for all shares
    for (const share of shares) {
      const computedMAC = this.computeMAC(share.value);
      if (computedMAC !== share.mac) {
        throw new MPCError('MAC verification failed', {
          code: MPCErrorCode.INVALID_SHARE
        });
      }
    }
    
    // Sum up the shares modulo 2^k
    const mask = (1n << BigInt(this.k)) - 1n;
    let result = 0n;
    for (const share of shares) {
      result = (result + BigInt(`0x${share.value}`)) & mask;
    }
    
    return {
      value: result.toString(),
      proof: this.generateZKProof(shares)
    };
  }

  public async multiply(a: MPCShare, b: MPCShare): Promise<MPCShare> {
    if (!this.preprocessingManager) {
      throw new Error('Preprocessing manager not initialized');
    }

    // Get a multiplication triple
    const [x, y, z] = await this.preprocessingManager.getTriple();

    // Compute d = a - x and e = b - y modulo 2^k
    const mask = (1n << BigInt(this.k)) - 1n;
    const d = (BigInt(`0x${a.value}`) - BigInt(`0x${x.value}`)) & mask;
    const e = (BigInt(`0x${b.value}`) - BigInt(`0x${y.value}`)) & mask;

    // Broadcast d and e
    const broadcastMessage: MPCMessage = {
      type: MPCMessageType.MULTIPLY,
      payload: {
        d: d.toString(16),
        e: e.toString(16),
        shareIndex: a.index
      },
      sender: this.partyId,
      receiver: -1,
      sessionId: this.sessionId,
      timestamp: Date.now()
    };

    await Promise.all(
      Array.from({ length: this.config.numParties }, (_, i) => i)
        .filter(i => i !== this.partyId)
        .map(i => this.sendMessage({ ...broadcastMessage, receiver: i }))
    );

    // Wait for d and e values from other parties
    const otherValues = await this.waitForMultiplicationMessages();

    // Compute result share modulo 2^k
    let result = BigInt(`0x${z.value}`);

    // Add d*y term
    result = (result + (d * BigInt(`0x${y.value}`))) & mask;

    // Add e*x term
    result = (result + (e * BigInt(`0x${x.value}`))) & mask;

    // Add d*e term
    result = (result + (d * e)) & mask;

    // Add cross terms from other parties
    for (const { d: otherD, e: otherE } of otherValues) {
      const dVal = BigInt(`0x${otherD}`);
      const eVal = BigInt(`0x${otherE}`);

      result = (result + (dVal * BigInt(`0x${y.value}`))) & mask;
      result = (result + (eVal * BigInt(`0x${x.value}`))) & mask;
      result = (result + (dVal * eVal)) & mask;
    }

    return {
      value: result.toString(16),
      index: this.partyId,
      mac: this.computeMAC(result.toString(16))
    };
  }

  public async compare(a: MPCShare, b: MPCShare): Promise<MPCShare> {
    if (!this.preprocessingManager) {
      throw new Error('Preprocessing manager not initialized');
    }

    // Get random bits for comparison
    const bits = await Promise.all(
      Array(this.k).fill(0).map(() => this.preprocessingManager!.getBit())
    );

    // Convert shares to binary representation
    const aBits = this.toBinary(BigInt(`0x${a.value}`));
    const bBits = this.toBinary(BigInt(`0x${b.value}`));

    // Compare bits from most significant to least significant
    let result = 0n;
    let isEqual = true;

    for (let i = this.k - 1; i >= 0; i--) {
      const xor = (aBits[i] ^ bBits[i]) === 1n;
      if (xor) {
        isEqual = false;
        result = aBits[i] === 1n ? 1n : -1n;
        break;
      }
    }

    if (isEqual) {
      result = 0n;
    }

    // Convert result to k-bit field element
    const mask = (1n << BigInt(this.k)) - 1n;
    const resultInField = ((result % (1n << BigInt(this.k))) + (1n << BigInt(this.k))) & mask;

    // Create shares of the comparison result
    const shares = await this.share(resultInField.toString());
    return shares[this.partyId];
  }

  private generateRandomKBitValue(): bigint {
    const bytes = crypto.randomBytes(Math.ceil(this.k / 8));
    const value = BigInt(`0x${bytes.toString('hex')}`);
    const mask = (1n << BigInt(this.k)) - 1n;
    return value & mask;
  }

  private computeMAC(value: string): string {
    const intValue = BigInt(`0x${value}`);
    const mask = (1n << BigInt(this.k)) - 1n;
    const macKey = this.generateMACKey();
    return ((intValue * macKey) & mask).toString(16);
  }

  private generateMACKey(): bigint {
    const bytes = crypto.randomBytes(Math.ceil(this.k / 8));
    const key = BigInt(`0x${bytes.toString('hex')}`);
    const mask = (1n << BigInt(this.k)) - 1n;
    return key & mask;
  }

  private toBinary(value: bigint): bigint[] {
    const bits: bigint[] = [];
    let temp = value;
    const mask = (1n << BigInt(this.k)) - 1n;
    temp &= mask;

    for (let i = 0; i < this.k; i++) {
      bits.push(temp & 1n);
      temp >>= 1n;
    }

    return bits.reverse();
  }

  private generateZKProof(shares: MPCShare[]): string {
    const proof = crypto.createHash('sha256');
    for (const share of shares) {
      proof.update(share.value + share.mac);
    }
    return proof.digest('hex');
  }

  private async waitForMultiplicationMessages(): Promise<Array<{ d: string, e: string }>> {
    return new Promise((resolve, reject) => {
      const values: Array<{ d: string, e: string }> = [];
      const timeout = setTimeout(() => {
        reject(new MPCError('Timeout waiting for multiplication messages', {
          code: MPCErrorCode.TIMEOUT
        }));
      }, this.config.messageTimeout || 5000);

      const messageHandler = (message: MPCMessage) => {
        if (message.type === MPCMessageType.MULTIPLY && 
            message.sender !== this.partyId) {
          const payload = message.payload as { d: string, e: string, shareIndex: number };
          values.push({ d: payload.d, e: payload.e });

          if (values.length === this.config.numParties - 1) {
            clearTimeout(timeout);
            this.removeListener('message', messageHandler);
            resolve(values);
          }
        }
      };

      this.on('message', messageHandler);
    });
  }

  protected async handleProtocolMessage(message: MPCMessage): Promise<void> {
    switch (message.type) {
      case MPCMessageType.SHARE:
        this.emit('message', message);
        break;
      case MPCMessageType.RECONSTRUCT:
        this.emit('message', message);
        break;
      case MPCMessageType.MULTIPLY:
        this.emit('message', message);
        break;
      case MPCMessageType.COMPARE:
        this.emit('message', message);
        break;
      default:
        throw new MPCError('Unknown protocol message type', {
          code: MPCErrorCode.PROTOCOL_ERROR
        });
    }
  }
} 