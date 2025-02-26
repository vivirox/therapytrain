import { MPSPDZComputation } from './mp-spdz-bindings';
import type { MPCConfig, MPCParty, MPCShare, MPCResult, MPCProtocol } from './mp-spdz-bindings/types';

export type { MPCConfig, MPCParty, MPCShare, MPCResult, MPCProtocol };

/**
 * High-level interface for secure multi-party computation using MP-SPDZ
 */
export class SecureMultiPartyComputation {
  private static instance: SecureMultiPartyComputation;
  private readonly mpc: MPSPDZComputation;

  private constructor(config: MPCConfig) {
    this.mpc = MPSPDZComputation.getInstance(config, process.env.MP_SPDZ_PATH || '/usr/local/mp-spdz');
  }

  public static getInstance(config: MPCConfig): SecureMultiPartyComputation {
    if (!SecureMultiPartyComputation.instance) {
      SecureMultiPartyComputation.instance = new SecureMultiPartyComputation(config);
    }
    return SecureMultiPartyComputation.instance;
  }

  public async initialize(): Promise<void> {
    await this.mpc.initialize();
  }

  public async share(value: number[] | bigint[], receivers?: number[]): Promise<MPCShare> {
    return this.mpc.share(value, receivers);
  }

  public async add(a: MPCShare, b: MPCShare): Promise<MPCShare> {
    return this.mpc.add(a, b);
  }

  public async multiply(a: MPCShare, b: MPCShare): Promise<MPCShare> {
    return this.mpc.multiply(a, b);
  }

  public async open<T>(share: MPCShare): Promise<MPCResult<T>> {
    return this.mpc.open<T>(share);
  }

  public destroy(): void {
    this.mpc.destroy();
  }
}