import { spawn } from "child_process";
import { join } from "path";
import { EventEmitter } from "events";
import { randomBytes } from "crypto";
import {
  MPCProtocol,
  MPCConfig,
  MPCParty,
  MPCShare,
  MPCResult,
  MPCError,
  MPCErrorType,
  PartyStatus,
} from "./types";
import { ValueEncoder } from "./encoding";
import { ShareDistributor } from "./sharing";
import { PartyNetwork, MessageType } from "./network";
import {
  createProtocolHandler,
  ProtocolHandler,
  ProtocolMessageType,
} from "./protocol-handlers";
import {
  createPreprocessingManager,
  PreprocessingManager,
  PreprocessingDataType,
} from "./preprocessing";

/**
 * Main class for managing MP-SPDZ computations
 */
export class MPSPDZComputation extends EventEmitter {
  private static instance: MPSPDZComputation;
  private readonly parties: Map<number, MPCParty> = new Map();
  private readonly binaryPath: string;
  private initialized = false;
  private encoder: ValueEncoder;
  private distributor: ShareDistributor;
  private network!: PartyNetwork;
  private sessionKey: Buffer;
  private protocolHandler!: ProtocolHandler;
  private preprocessingManager!: PreprocessingManager;

  private constructor(
    private readonly config: MPCConfig,
    mpspdzPath: string,
  ) {
    super();
    this.binaryPath = mpspdzPath;
    this.sessionKey = randomBytes(32);
    this.encoder = new ValueEncoder({
      protocol: config.protocol,
      prime: config.prime,
      bitLength: config.protocol === MPCProtocol.SPDZ2K ? 64 : undefined,
    });
    this.distributor = new ShareDistributor({
      threshold: config.threshold || Math.floor(config.numParties / 2) + 1,
      parties: this.parties,
      encoder: this.encoder,
    });
  }

  public static getInstance(
    config: MPCConfig,
    mpspdzPath: string,
  ): MPSPDZComputation {
    if (!MPSPDZComputation.instance) {
      MPSPDZComputation.instance = new MPSPDZComputation(config, mpspdzPath);
    }
    return MPSPDZComputation.instance;
  }

  /**
   * Initialize the MP-SPDZ computation environment
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      throw new MPCError(
        MPCErrorType.INITIALIZATION_ERROR,
        "MP-SPDZ computation already initialized",
      );
    }

    try {
      // Create protocol handler and preprocessing manager
      this.protocolHandler = createProtocolHandler(this.config.protocol);
      this.preprocessingManager = createPreprocessingManager(
        this.config.protocol,
        0, // Main party ID
        this.config.numParties,
        join(this.binaryPath, "preprocessing"),
        this.config.prime,
        this.config.protocol === MPCProtocol.SPDZ2K ? 64 : undefined,
      );

      // Start party processes
      for (let i = 0; i < this.config.numParties; i++) {
        const party = await this.startPartyProcess(i);
        this.parties.set(i, party);
      }

      // Initialize network layer
      this.network = new PartyNetwork({
        partyId: 0, // Main party ID
        parties: this.parties,
        sessionKey: this.sessionKey,
        ...this.config.networkConfig,
      });

      // Set up network event handlers
      this.setupNetworkHandlers();

      // Initialize network connections
      await this.network.initialize();

      // Generate initial preprocessing data
      await this.generatePreprocessingData();

      // Wait for all parties to be ready
      await this.waitForParties();

      this.initialized = true;
      this.emit("initialized");
    } catch (error) {
      throw new MPCError(
        MPCErrorType.INITIALIZATION_ERROR,
        "Failed to initialize MP-SPDZ computation",
        error,
      );
    }
  }

  /**
   * Share a value among parties
   */
  public async share(
    value: number[] | bigint[],
    receivers?: number[],
  ): Promise<MPCShare> {
    this.checkInitialized();

    try {
      const shares = await this.distributor.distribute(value, receivers);

      // Distribute shares to respective parties
      await Promise.all(
        shares.map(async (share) => {
          const message = {
            type: ProtocolMessageType.SHARE,
            sender: 0,
            receiver: share.partyId,
            data: share,
            metadata: {
              timestamp: Date.now(),
              sequence: this.generateSequenceNumber(),
              sessionId: this.sessionKey.toString("hex"),
            },
          };
          await this.protocolHandler.handleShare(message);
          await this.network.sendMessage(
            share.partyId,
            MessageType.SHARE,
            share,
          );
        }),
      );

      // Return the first share (main party's share)
      return shares[0];
    } catch (error) {
      throw new MPCError(
        MPCErrorType.COMPUTATION_ERROR,
        "Failed to create shares",
        error,
      );
    }
  }

  /**
   * Add two secret shares
   */
  public async add(a: MPCShare, b: MPCShare): Promise<MPCShare> {
    this.checkInitialized();

    try {
      // Protocol-specific addition
      const message = {
        type: ProtocolMessageType.MULTIPLICATION,
        sender: 0,
        data: { a, b },
        metadata: {
          timestamp: Date.now(),
          sequence: this.generateSequenceNumber(),
          sessionId: this.sessionKey.toString("hex"),
        },
      };
      return await this.protocolHandler.handleMultiplication(message);
    } catch (error) {
      throw new MPCError(
        MPCErrorType.COMPUTATION_ERROR,
        "Failed to add shares",
        error,
      );
    }
  }

  /**
   * Multiply two secret shares
   */
  public async multiply(a: MPCShare, b: MPCShare): Promise<MPCShare> {
    this.checkInitialized();

    try {
      // Protocol-specific multiplication
      const message = {
        type: ProtocolMessageType.MULTIPLICATION,
        sender: 0,
        data: { a, b },
        metadata: {
          timestamp: Date.now(),
          sequence: this.generateSequenceNumber(),
          sessionId: this.sessionKey.toString("hex"),
        },
      };
      return await this.protocolHandler.handleMultiplication(message);
    } catch (error) {
      throw new MPCError(
        MPCErrorType.COMPUTATION_ERROR,
        "Failed to multiply shares",
        error,
      );
    }
  }

  /**
   * Open a secret share to reveal its value
   */
  public async open<T>(share: MPCShare): Promise<MPCResult<T>> {
    this.checkInitialized();

    try {
      // Request shares from all parties
      await this.network.broadcast(MessageType.SHARE, {
        operation: "open",
        shareId: share.id,
      });

      // Collect shares from all parties
      const shares = await this.collectShares(share.id);

      // Reconstruct the value
      const value = await this.distributor.reconstruct<T>(shares);

      // Verify the result with protocol-specific proof
      const proof = await this.generateProof(shares);
      const verified = await this.protocolHandler.handleProof({
        type: ProtocolMessageType.PROOF,
        sender: 0,
        data: proof,
        metadata: {
          timestamp: Date.now(),
          sequence: this.generateSequenceNumber(),
          sessionId: this.sessionKey.toString("hex"),
        },
      });

      return {
        value,
        metadata: {
          field: share.metadata?.field,
          bitLength: share.metadata?.bitLength,
          verified,
        },
      };
    } catch (error) {
      throw new MPCError(
        MPCErrorType.COMPUTATION_ERROR,
        "Failed to open share",
        error,
      );
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.network) {
      this.network.destroy();
    }

    for (const party of this.parties.values()) {
      if (party.process) {
        party.process.kill();
      }
    }

    this.parties.clear();
    this.initialized = false;
    this.emit("destroyed");
  }

  private async startPartyProcess(id: number): Promise<MPCParty> {
    const basePort = 14000; // Base port for party communication
    const port = basePort + id;
    const host = "localhost";

    const binaryName = `${this.config.protocol}-party.x`;
    const binaryPath = join(this.binaryPath, binaryName);

    const args = [
      "-N",
      String(this.config.numParties),
      "-p",
      String(id),
      "-h",
      host,
      "-P",
      String(port),
    ];

    if (this.config.threshold) {
      args.push("-t", String(this.config.threshold));
    }

    if (this.config.prime) {
      args.push("-f", this.config.prime.toString());
    }

    try {
      const process = spawn(binaryPath, args);

      process.on("error", (error) => {
        this.emit(
          "error",
          new MPCError(
            MPCErrorType.PROTOCOL_ERROR,
            `Party ${id} process error`,
            error,
          ),
        );
      });

      return {
        id,
        host,
        port,
        process,
        status: PartyStatus.CONNECTING,
      };
    } catch (error) {
      throw new MPCError(
        MPCErrorType.INITIALIZATION_ERROR,
        `Failed to start party ${id} process`,
        error,
      );
    }
  }

  private setupNetworkHandlers(): void {
    this.network.on("message", this.handleMessage.bind(this));
    this.network.on("error", (error) => {
      this.emit(
        "error",
        new MPCError(MPCErrorType.NETWORK_ERROR, "Network error", error),
      );
    });
  }

  private async waitForParties(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new MPCError(
            MPCErrorType.INITIALIZATION_ERROR,
            "Timeout waiting for parties to be ready",
          ),
        );
      }, 30000);

      const checkParties = () => {
        const allReady = Array.from(this.parties.values()).every(
          (party) => party.status === PartyStatus.READY,
        );

        if (allReady) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkParties, 100);
        }
      };

      checkParties();
    });
  }

  private async generatePreprocessingData(): Promise<void> {
    try {
      // Generate preprocessing data for each type
      for (const type of Object.values(PreprocessingDataType)) {
        const data = await this.preprocessingManager.generateData(type, 1000); // Generate 1000 items
        await this.preprocessingManager.storeData(data);
      }

      // Clean up old preprocessing data
      await this.preprocessingManager.cleanupOldData();
    } catch (error) {
      throw new MPCError(
        MPCErrorType.INITIALIZATION_ERROR,
        "Failed to generate preprocessing data",
        error,
      );
    }
  }

  private async generateProof(shares: MPCShare[]): Promise<any> {
    // Protocol-specific proof generation
    // This is a placeholder - actual implementation depends on the protocol
    return {
      type: "proof",
      data: Buffer.concat(shares.map(share => Buffer.from(share.value))),
      signature: "signature"
    };
  }

  private async collectShares(shareId: string): Promise<MPCShare[]> {
    return new Promise((resolve, reject) => {
      const shares: MPCShare[] = [];
      const timeout = setTimeout(() => {
        reject(
          new MPCError(
            MPCErrorType.COMPUTATION_ERROR,
            "Timeout collecting shares",
          ),
        );
      }, 10000);

      const handler = (message: any) => {
        if (message.type === MessageType.SHARE && message.shareId === shareId) {
          shares.push(message.share);
          if (shares.length === this.config.numParties) {
            this.network.off("message", handler);
            clearTimeout(timeout);
            resolve(shares);
          }
        }
      };

      this.network.on("message", handler);
    });
  }

  private async handleMessage(message: any): Promise<void> {
    try {
      switch (message.type) {
        case MessageType.SHARE:
          await this.handleShareMessage(message);
          break;
        case MessageType.SYNC:
          await this.handleSyncMessage(message);
          break;
        case MessageType.HEARTBEAT:
          await this.handleHeartbeatMessage(message);
          break;
        default:
          throw new MPCError(
            MPCErrorType.PROTOCOL_ERROR,
            `Unknown message type: ${message.type}`,
          );
      }
    } catch (error) {
      this.emit(
        "error",
        new MPCError(
          MPCErrorType.PROTOCOL_ERROR,
          "Failed to handle message",
          error,
        ),
      );
    }
  }

  private async handleShareMessage(message: any): Promise<void> {
    await this.protocolHandler.handleShare(message);
  }

  private async handleSyncMessage(message: any): Promise<void> {
    await this.protocolHandler.handleSync(message);
  }

  private async handleHeartbeatMessage(message: any): Promise<void> {
    const party = this.parties.get(message.sender);
    if (party) {
      party.lastHeartbeat = Date.now();
    }
  }

  private checkInitialized(): void {
    if (!this.initialized) {
      throw new MPCError(
        MPCErrorType.INITIALIZATION_ERROR,
        "MP-SPDZ computation not initialized",
      );
    }
  }

  private generateSequenceNumber(): number {
    return Date.now();
  }
}
