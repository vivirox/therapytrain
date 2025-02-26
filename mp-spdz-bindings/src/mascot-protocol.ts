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

const log = debug('mp-spdz:mascot');

class MascotPreprocessingManager implements PreprocessingManager {
  private process: any;
  private dataDir: string;
  private triples: [MPCShare, MPCShare, MPCShare][] = [];
  private bits: MPCShare[] = [];

  constructor(private partyId: number, private numParties: number) {
    this.dataDir = join(process.cwd(), 'Player-Data');
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
        './mascot-party.x',
        [
          '-p', this.partyId.toString(),
          '-N', this.numParties.toString(),
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
    // Parse the output and store the generated values
    // This is a simplified version - in reality, we'd need to parse the actual MP-SPDZ output format
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
    return {
      value: Buffer.from(value, 'hex').toString('base64'),
      index: this.partyId,
      mac: '' // In reality, we'd compute the MAC here
    };
  }
}

export class MascotProtocolHandler extends BaseProtocolHandler {
  protected async setupPreprocessing(): Promise<void> {
    this.preprocessingManager = new MascotPreprocessingManager(
      this.partyId,
      this.config.numParties
    );
    await this.preprocessingManager.generateTriples(this.config.preprocessingBatchSize || 1000);
    await this.preprocessingManager.generateBits(this.config.preprocessingBatchSize || 1000);
  }

  public async share(value: string): Promise<MPCShare[]> {
    // Convert value to field element
    const fieldElement = Buffer.from(value).toString('hex');
    
    // Generate random shares that sum to the field element
    const shares: MPCShare[] = [];
    let remainingValue = BigInt(`0x${fieldElement}`);
    
    // Generate n-1 random shares
    for (let i = 0; i < this.config.numParties - 1; i++) {
      const randomShare = this.generateRandomFieldElement();
      remainingValue = (remainingValue - randomShare + this.config.fieldSize) % this.config.fieldSize;
      
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
    
    // Sum up the shares in the field
    let result = BigInt(0);
    for (const share of shares) {
      result = (result + BigInt(`0x${share.value}`)) % this.config.fieldSize;
    }
    
    // Convert result back to string
    return {
      value: Buffer.from(result.toString(16), 'hex').toString(),
      proof: this.generateZKProof(shares) // Optional: generate zero-knowledge proof
    };
  }

  private generateRandomFieldElement(): bigint {
    // Generate a random element in the field
    const bytes = crypto.randomBytes(Math.ceil(this.config.fieldSize.toString(2).length / 8));
    let rand = BigInt(`0x${bytes.toString('hex')}`);
    return rand % this.config.fieldSize;
  }

  private computeMAC(value: string): string {
    // Compute MAC using a key derived from the session ID
    const key = crypto.createHash('sha256')
      .update(this.sessionId)
      .update(this.partyId.toString())
      .digest();
      
    return crypto.createHmac('sha256', key)
      .update(value)
      .digest('hex');
  }

  private generateZKProof(shares: MPCShare[]): string {
    // Generate a zero-knowledge proof that the reconstruction is correct
    // This is a simplified version - in reality, we'd use a proper ZK proof system
    const proof = crypto.createHash('sha256');
    for (const share of shares) {
      proof.update(share.value + share.mac);
    }
    return proof.digest('hex');
  }

  public async multiply(a: MPCShare, b: MPCShare): Promise<MPCShare> {
    if (!this.preprocessingManager) {
      throw new Error('Preprocessing manager not initialized');
    }

    // Get a multiplication triple (x, y, z where z = x * y)
    const [x, y, z] = await this.preprocessingManager.getTriple();

    // Compute d = a - x and e = b - y
    const d = (BigInt(`0x${a.value}`) - BigInt(`0x${x.value}`) + this.config.fieldSize) % this.config.fieldSize;
    const e = (BigInt(`0x${b.value}`) - BigInt(`0x${y.value}`) + this.config.fieldSize) % this.config.fieldSize;

    // Broadcast d and e to all parties
    const broadcastMessage: MPCMessage = {
      type: MPCMessageType.MULTIPLY,
      payload: {
        d: d.toString(16),
        e: e.toString(16),
        shareIndex: a.index
      },
      sender: this.partyId,
      receiver: -1, // Broadcast to all
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

    // Compute the result share
    // result = z + d*y + e*x + d*e
    let result = BigInt(`0x${z.value}`);

    // Add d*y term
    result = (result + (d * BigInt(`0x${y.value}`))) % this.config.fieldSize;

    // Add e*x term
    result = (result + (e * BigInt(`0x${x.value}`))) % this.config.fieldSize;

    // Add d*e term
    result = (result + (d * e)) % this.config.fieldSize;

    // Add cross terms from other parties
    for (const { d: otherD, e: otherE } of otherValues) {
      const dVal = BigInt(`0x${otherD}`);
      const eVal = BigInt(`0x${otherE}`);

      // Add d*y and e*x terms for other party's values
      result = (result + (dVal * BigInt(`0x${y.value}`))) % this.config.fieldSize;
      result = (result + (eVal * BigInt(`0x${x.value}`))) % this.config.fieldSize;
      result = (result + (dVal * eVal)) % this.config.fieldSize;
    }

    // Create the result share with MAC
    const resultShare: MPCShare = {
      value: result.toString(16),
      index: this.partyId,
      mac: this.computeMAC(result.toString(16))
    };

    return resultShare;
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

  public async compare(a: MPCShare, b: MPCShare): Promise<MPCShare> {
    if (!this.preprocessingManager) {
      throw new Error('Preprocessing manager not initialized');
    }

    // Get random bits for comparison
    const bits = await Promise.all(
      Array(this.config.fieldSize).fill(0).map(() => this.preprocessingManager!.getBit())
    );

    // Convert a and b to binary representation
    const aBits = this.toBinary(BigInt(`0x${a.value}`));
    const bBits = this.toBinary(BigInt(`0x${b.value}`));

    // Compare bits from most significant to least significant
    let result = BigInt(0);
    let isEqual = true;

    for (let i = this.config.fieldSize - 1; i >= 0; i--) {
      // Get random bit for this position
      const r = BigInt(`0x${bits[i].value}`);

      // Compute XOR of bits at position i
      const xor = (aBits[i] ^ bBits[i]) === 1n;

      if (xor) {
        isEqual = false;
        // If bits differ, the result depends on a's bit
        result = aBits[i] === 1n ? 1n : -1n;
        break;
      }
    }

    // If all bits are equal, result is 0
    if (isEqual) {
      result = 0n;
    }

    // Convert result to field element and create share
    const resultInField = ((result % this.config.fieldSize) + this.config.fieldSize) % this.config.fieldSize;

    // Create shares of the comparison result
    const shares = await this.share(resultInField.toString(16));

    // Return this party's share
    return shares[this.partyId];
  }

  private toBinary(value: bigint): bigint[] {
    const bits: bigint[] = [];
    let temp = value;

    for (let i = 0; i < this.config.fieldSize; i++) {
      bits.push(temp & 1n);
      temp >>= 1n;
    }

    return bits.reverse(); // Most significant bit first
  }

  protected async handleProtocolMessage(message: MPCMessage): Promise<void> {
    switch (message.type) {
      case MPCMessageType.SHARE:
        // Handle share distribution
        this.emit('message', message);
        break;
      case MPCMessageType.RECONSTRUCT:
        // Handle reconstruction
        this.emit('message', message);
        break;
      case MPCMessageType.MULTIPLY:
        // Handle multiplication protocol messages
        this.emit('message', message);
        break;
      case MPCMessageType.COMPARE:
        // Handle comparison protocol messages
        this.emit('message', message);
        break;
      default:
        throw new MPCError('Unknown protocol message type', {
          code: MPCErrorCode.PROTOCOL_ERROR
        });
    }
  }
} 