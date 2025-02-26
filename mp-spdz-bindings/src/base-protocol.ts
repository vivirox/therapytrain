import WebSocket from 'ws';
import { createHash, randomBytes } from 'crypto';
import debug from 'debug';
import {
  MPCConfig,
  MPCParty,
  MPCShare,
  MPCResult,
  MPCMessage,
  MPCMessageType,
  MPCError,
  MPCErrorCode,
  MPCProtocolHandler,
  PreprocessingManager
} from './types';

const log = debug('mp-spdz:base');

export abstract class BaseProtocolHandler implements MPCProtocolHandler {
  protected config!: MPCConfig;
  protected parties: MPCParty[] = [];
  protected connections: Map<number, WebSocket> = new Map();
  protected sessionId: string = '';
  protected partyId: number = -1;
  protected preprocessingManager?: PreprocessingManager;

  constructor() {
    this.handleWebSocketMessage = this.handleWebSocketMessage.bind(this);
  }

  public async initialize(config: MPCConfig): Promise<void> {
    this.config = config;
    this.sessionId = this.generateSessionId();
    log('Initialized protocol with config:', config);
  }

  public async connect(parties: MPCParty[]): Promise<void> {
    this.parties = parties;
    this.partyId = this.findOwnPartyId();

    if (this.partyId === -1) {
      throw new Error('Could not determine own party ID');
    }

    await this.setupConnections();
    await this.setupPreprocessing();
    log('Connected to all parties');
  }

  public async disconnect(): Promise<void> {
    for (const [id, ws] of this.connections) {
      ws.close();
      this.connections.delete(id);
    }
    await this.cleanupPreprocessing();
    log('Disconnected from all parties');
  }

  public abstract share(value: string): Promise<MPCShare[]>;
  public abstract reconstruct(shares: MPCShare[]): Promise<MPCResult>;
  public abstract multiply(a: MPCShare, b: MPCShare): Promise<MPCShare>;
  public abstract compare(a: MPCShare, b: MPCShare): Promise<MPCShare>;

  public async handleMessage(message: MPCMessage): Promise<void> {
    log('Received message:', message.type);
    
    switch (message.type) {
      case MPCMessageType.HEARTBEAT:
        await this.handleHeartbeat(message);
        break;
      case MPCMessageType.SYNC:
        await this.handleSync(message);
        break;
      case MPCMessageType.ERROR:
        await this.handleError(message);
        break;
      default:
        await this.handleProtocolMessage(message);
    }
  }

  protected async handleProtocolMessage(message: MPCMessage): Promise<void> {
    throw new Error('Protocol message handler not implemented');
  }

  protected async setupPreprocessing(): Promise<void> {
    // Implement in protocol-specific classes
  }

  protected async cleanupPreprocessing(): Promise<void> {
    if (this.preprocessingManager) {
      await this.preprocessingManager.cleanup();
    }
  }

  protected async sendMessage(message: Partial<MPCMessage>, to?: number): Promise<void> {
    const fullMessage: MPCMessage = {
      type: message.type!,
      payload: message.payload,
      sender: this.partyId,
      receiver: to,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      ...message
    };

    if (to !== undefined) {
      const ws = this.connections.get(to);
      if (!ws) {
        throw new Error(`No connection to party ${to}`);
      }
      ws.send(JSON.stringify(fullMessage));
    } else {
      for (const [id, ws] of this.connections) {
        if (id !== this.partyId) {
          ws.send(JSON.stringify(fullMessage));
        }
      }
    }
  }

  private async setupConnections(): Promise<void> {
    const connectPromises = this.parties.map(async (party) => {
      if (party.id === this.partyId) return;

      const ws = new WebSocket(`ws://${party.host}:${party.port}`);
      
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Connection timeout to party ${party.id}`));
        }, 30000);

        ws.on('open', () => {
          this.connections.set(party.id, ws);
          ws.on('message', this.handleWebSocketMessage);
          clearTimeout(timeout);
          resolve();
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });

    await Promise.all(connectPromises);
  }

  private handleWebSocketMessage(data: WebSocket.Data): void {
    try {
      const message: MPCMessage = JSON.parse(data.toString());
      this.handleMessage(message).catch((error) => {
        log('Error handling message:', error);
        this.sendMessage({
          type: MPCMessageType.ERROR,
          payload: {
            message: error.message,
            code: MPCErrorCode.PROTOCOL_ERROR
          }
        }, message.sender).catch(log);
      });
    } catch (error) {
      log('Error parsing message:', error);
    }
  }

  private async handleHeartbeat(message: MPCMessage): Promise<void> {
    await this.sendMessage({
      type: MPCMessageType.HEARTBEAT,
      payload: { timestamp: Date.now() }
    }, message.sender);
  }

  private async handleSync(message: MPCMessage): Promise<void> {
    await this.sendMessage({
      type: MPCMessageType.SYNC,
      payload: { status: 'ready' }
    }, message.sender);
  }

  private async handleError(message: MPCMessage): Promise<void> {
    const error = message.payload as MPCError;
    log('Received error from party', message.sender, ':', error);
  }

  private generateSessionId(): string {
    const random = randomBytes(16).toString('hex');
    const timestamp = Date.now().toString();
    return createHash('sha256')
      .update(random + timestamp)
      .digest('hex');
  }

  private findOwnPartyId(): number {
    // In a real implementation, this would use TLS certificates or other authentication
    // For now, we'll just use a simple host/port check
    const ownParty = this.parties.find(
      (p) => p.host === 'localhost' || p.host === '127.0.0.1'
    );
    return ownParty ? ownParty.id : -1;
  }
} 