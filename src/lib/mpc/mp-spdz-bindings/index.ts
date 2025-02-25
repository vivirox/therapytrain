import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import {
  MPCConfig,
  MPCParty,
  MPCProtocol,
  MPCResult,
  MPCShare,
  MPCError
} from './types';
import { encoding } from './encoding';

/**
 * MP-SPDZ TypeScript bindings implementation
 * Provides a high-level interface to interact with MP-SPDZ protocols
 */
export class MPSPDZComputation extends EventEmitter {
  private static instance: MPSPDZComputation;
  private readonly config: MPCConfig;
  private parties: Map<number, MPCParty>;
  private process?: ChildProcess;
  private ready: boolean = false;
  private readonly mpSpdzPath: string;

  private constructor(config: MPCConfig, mpSpdzPath: string) {
    super();
    this.config = {
      ...config,
      threshold: config.threshold || Math.floor(config.partyCount / 2) + 1,
      securityParameter: config.securityParameter || 128
    };
    this.parties = new Map();
    this.mpSpdzPath = mpSpdzPath;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config: MPCConfig, mpSpdzPath: string): MPSPDZComputation {
    if (!MPSPDZComputation.instance) {
      MPSPDZComputation.instance = new MPSPDZComputation(config, mpSpdzPath);
    }
    return MPSPDZComputation.instance;
  }

  /**
   * Initialize MP-SPDZ computation
   */
  public async initialize(): Promise<void> {
    if (this.ready) return;

    try {
      // Compile the protocol binary if needed
      await this.compileProtocol();

      // Start the MP-SPDZ process
      const protocolBinary = this.getProtocolBinary();
      this.process = spawn(
        path.join(this.mpSpdzPath, protocolBinary),
        this.getProtocolArgs(),
        {
          cwd: this.mpSpdzPath,
          stdio: ['pipe', 'pipe', 'pipe']
        }
      );

      // Handle process events
      this.process.stdout?.on('data', this.handleOutput.bind(this));
      this.process.stderr?.on('data', this.handleError.bind(this));
      this.process.on('exit', this.handleExit.bind(this));

      // Wait for ready signal
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Initialization timeout'));
        }, 30000);

        this.once('ready', () => {
          clearTimeout(timeout);
          this.ready = true;
          resolve();
        });
      });
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * Share a secret value with other parties
   */
  public async share(value: number[] | bigint[], receivers?: number[]): Promise<MPCShare> {
    if (!this.ready) {
      throw new Error('MPC instance not initialized');
    }

    try {
      const encoded = this.encodeValue(value);
      const cmd = {
        type: 'share',
        value: encoded,
        receivers: receivers || Array.from(this.parties.keys())
      };

      const result = await this.sendCommand(cmd);
      return this.decodeShare(result);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * Perform secure addition on shared values
   */
  public async add(a: MPCShare, b: MPCShare): Promise<MPCShare> {
    if (!this.ready) {
      throw new Error('MPC instance not initialized');
    }

    try {
      const cmd = {
        type: 'add',
        shares: [a, b]
      };

      const result = await this.sendCommand(cmd);
      return this.decodeShare(result);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * Perform secure multiplication on shared values
   */
  public async multiply(a: MPCShare, b: MPCShare): Promise<MPCShare> {
    if (!this.ready) {
      throw new Error('MPC instance not initialized');
    }

    try {
      const cmd = {
        type: 'multiply',
        shares: [a, b]
      };

      const result = await this.sendCommand(cmd);
      return this.decodeShare(result);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * Open a shared value to reveal the result
   */
  public async open<T>(share: MPCShare): Promise<MPCResult<T>> {
    if (!this.ready) {
      throw new Error('MPC instance not initialized');
    }

    try {
      const cmd = {
        type: 'open',
        share
      };

      const result = await this.sendCommand(cmd);
      return this.decodeResult<T>(result);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.process) {
      this.process.kill();
      this.process = undefined;
    }
    this.ready = false;
    this.parties.clear();
  }

  private async compileProtocol(): Promise<void> {
    const compileScript = path.join(this.mpSpdzPath, 'compile.py');
    return new Promise((resolve, reject) => {
      const process = spawn('python3', [compileScript, this.config.protocol], {
        cwd: this.mpSpdzPath
      });

      process.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Protocol compilation failed with code ${code}`));
        }
      });
    });
  }

  private getProtocolBinary(): string {
    switch (this.config.protocol) {
      case MPCProtocol.MASCOT:
        return 'mascot-party.x';
      case MPCProtocol.SPDZ2k:
        return 'spdz2k-party.x';
      case MPCProtocol.SEMI2k:
        return 'semi2k-party.x';
      case MPCProtocol.TINY:
        return 'tiny-party.x';
      default:
        throw new Error(`Unsupported protocol: ${this.config.protocol}`);
    }
  }

  private getProtocolArgs(): string[] {
    return [
      '-N', this.config.partyCount.toString(),
      '-T', this.config.threshold.toString(),
      '-k', (this.config.securityParameter || 128).toString(),
      ...(this.config.fieldSize ? ['-p', this.config.fieldSize.toString()] : [])
    ];
  }

  private handleOutput(data: Buffer): void {
    const output = data.toString().trim();
    if (output.includes('Ready for input')) {
      this.emit('ready');
    }
    // Handle other output types
  }

  private handleError(data: Buffer): void {
    const error = data.toString().trim();
    this.emit('error', new Error(error));
  }

  private handleExit(code: number): void {
    if (code !== 0) {
      this.emit('error', new Error(`Process exited with code ${code}`));
    }
    this.ready = false;
  }

  private async sendCommand(cmd: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Command timeout'));
      }, 30000);

      this.once('result', (result) => {
        clearTimeout(timeout);
        resolve(result);
      });

      this.process?.stdin?.write(JSON.stringify(cmd) + '\n');
    });
  }

  private encodeValue(value: number[] | bigint[]): Uint8Array {
    return encoding.encodeValue(value, this.config.fieldSize);
  }

  private decodeShare(data: any): MPCShare {
    return encoding.decodeShare(data);
  }

  private decodeResult<T>(data: any): MPCResult<T> {
    return encoding.decodeResult<T>(data);
  }

  private wrapError(error: any): MPCError {
    if (error instanceof Error) {
      return {
        ...error,
        code: 'MPC_ERROR',
        details: { originalError: error.message }
      };
    }
    return {
      name: 'MPCError',
      message: String(error),
      code: 'MPC_ERROR',
      details: { originalError: error }
    };
  }
} 