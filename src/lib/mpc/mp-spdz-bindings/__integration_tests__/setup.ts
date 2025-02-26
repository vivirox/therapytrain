import { spawn, ChildProcess } from 'child_process';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { MPCProtocol } from '../types';

/**
 * Configuration for MP-SPDZ test environment
 */
export interface TestConfig {
  protocol: MPCProtocol;
  numParties: number;
  basePort: number;
  preprocessingDir: string;
  binaryDir: string;
}

/**
 * Manages MP-SPDZ binary processes for integration testing
 */
export class TestEnvironment {
  private processes: ChildProcess[] = [];
  private config: TestConfig;

  constructor(config: TestConfig) {
    this.config = config;
  }

  /**
   * Start MP-SPDZ binary for a party
   */
  async startParty(partyId: number): Promise<void> {
    if (this.processes.length >= this.config.numParties) {
      throw new Error(`All parties are already running`);
    }

    const binaryName = this.getBinaryName();
    const args = this.getPartyArgs(partyId);

    const process = spawn(join(this.config.binaryDir, binaryName), args, {
      stdio: 'pipe',
      env: {
        ...process.env,
        PREPROCESSING_DIR: this.config.preprocessingDir
      }
    });

    process.on('error', (error) => {
      console.error(`Party ${partyId} process error:`, error);
    });

    process.stdout?.on('data', (data) => {
      console.log(`Party ${partyId} stdout:`, data.toString());
    });

    process.stderr?.on('data', (data) => {
      console.error(`Party ${partyId} stderr:`, data.toString());
    });

    this.processes.push(process);

    // Wait for process to be ready
    await this.waitForPartyReady(partyId);
  }

  /**
   * Start all parties for the test
   */
  async startAllParties(): Promise<void> {
    const startPromises = Array.from(
      { length: this.config.numParties },
      (_, i) => this.startParty(i)
    );
    await Promise.all(startPromises);
  }

  /**
   * Generate preprocessing data for the test
   */
  async generatePreprocessing(): Promise<void> {
    const preprocessingPath = this.getPreprocessingPath();
    
    try {
      await mkdir(preprocessingPath, { recursive: true });
    } catch (error) {
      console.warn('Directory already exists:', preprocessingPath);
    }

    const binaryName = this.getBinaryName();
    const binary = join(this.config.binaryDir, binaryName);
    const args = [
      '-N', String(this.config.numParties),
      '-p', String(this.config.basePort),
      '--preprocessing-dir', preprocessingPath,
      '--generate-preprocessing'
    ];

    return new Promise((resolve, reject) => {
      const process = spawn(binary, args);
      
      process.stdout.on('data', data => {
        console.log(`[Preprocessing] ${data}`);
      });

      process.stderr.on('data', data => {
        console.error(`[Preprocessing Error] ${data}`);
      });

      process.on('close', code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Preprocessing failed with code ${code}`));
        }
      });
    });
  }

  /**
   * Stop all running processes
   */
  async cleanup(): Promise<void> {
    // Kill all running processes
    for (const process of this.processes) {
      process.kill();
    }
    this.processes = [];

    // Clean up preprocessing directory
    try {
      await rm(this.getPreprocessingPath(), { recursive: true, force: true });
    } catch (error) {
      console.warn('Error cleaning up preprocessing directory:', error);
    }
  }

  /**
   * Get the binary name based on protocol
   */
  private getBinaryName(): string {
    switch (this.config.protocol) {
      case MPCProtocol.MASCOT:
        return 'mascot-party.x';
      case MPCProtocol.SPDZ2K:
        return 'spdz2k-party.x';
      case MPCProtocol.SEMI2K:
        return 'semi2k-party.x';
      default:
        throw new Error(`Unsupported protocol: ${this.config.protocol}`);
    }
  }

  /**
   * Get the preprocessing path based on protocol
   */
  private getPreprocessingPath(): string {
    return join(
      this.config.preprocessingDir,
      this.config.protocol.toLowerCase(),
      `${this.config.numParties}-parties`
    );
  }

  /**
   * Get command line arguments for party binary
   */
  private getPartyArgs(partyId: number): string[] {
    return [
      '-N', String(this.config.numParties),
      '-p', String(this.config.basePort + partyId),
      '-ip', 'localhost',
      '-port', String(this.config.basePort + partyId)
    ];
  }

  /**
   * Wait for a party to be ready
   */
  private async waitForPartyReady(partyId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = this.processes.find(p => p.pid === partyId);
      if (!process) {
        reject(new Error(`Party ${partyId} not found`));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error(`Party ${partyId} startup timeout`));
      }, 30000);

      const onData = (data: Buffer) => {
        const output = data.toString();
        if (output.includes('Party is ready')) {
          clearTimeout(timeout);
          process.stdout?.removeListener('data', onData);
          resolve();
        }
      };

      process.stdout?.on('data', onData);
    });
  }
} 