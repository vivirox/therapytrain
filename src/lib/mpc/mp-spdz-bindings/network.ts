import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { createHash, randomBytes } from 'crypto';
import { MPCError, MPCErrorType, MPCParty } from './types';

/**
 * Message types for party communication
 */
export enum MessageType {
  HANDSHAKE = 'handshake',
  SHARE = 'share',
  SYNC = 'sync',
  HEARTBEAT = 'heartbeat',
  PREPROCESSING = 'preprocessing'
}

/**
 * Message structure for party communication
 */
interface Message {
  type: MessageType;
  sender: number;
  receiver?: number;
  data: any;
  nonce: string;
  mac: string;
}

/**
 * Network configuration
 */
interface NetworkConfig {
  partyId: number;
  parties: Map<number, MPCParty>;
  sessionKey: Buffer;
  retryDelay?: number;
  heartbeatInterval?: number;
}

/**
 * Manages network communication between parties
 */
export class PartyNetwork extends EventEmitter {
  private connections: Map<number, WebSocket> = new Map();
  private server?: WebSocket.Server;
  private readonly sessionKey: Buffer;
  private readonly retryDelay: number;
  private readonly heartbeatInterval: number;
  private heartbeatTimers: Map<number, NodeJS.Timeout> = new Map();

  constructor(private readonly config: NetworkConfig) {
    super();
    this.sessionKey = config.sessionKey;
    this.retryDelay = config.retryDelay || 5000;
    this.heartbeatInterval = config.heartbeatInterval || 30000;
  }

  /**
   * Initialize network connections
   */
  public async initialize(): Promise<void> {
    try {
      // Start WebSocket server for this party
      const party = this.config.parties.get(this.config.partyId);
      if (!party) {
        throw new MPCError(
          MPCErrorType.INITIALIZATION_ERROR,
          `Party ${this.config.partyId} not found`
        );
      }

      this.server = new WebSocket.Server({ port: party.port });
      this.setupServer();

      // Connect to other parties
      await this.connectToParties();

      // Start heartbeat mechanism
      this.startHeartbeat();
    } catch (error) {
      throw new MPCError(
        MPCErrorType.NETWORK_ERROR,
        'Failed to initialize network',
        error
      );
    }
  }

  /**
   * Send a message to a specific party
   */
  public async sendMessage(targetParty: number, type: MessageType, data: any): Promise<void> {
    const connection = this.connections.get(targetParty);
    if (!connection) {
      throw new MPCError(
        MPCErrorType.NETWORK_ERROR,
        `No connection to party ${targetParty}`
      );
    }

    const message: Message = {
      type,
      sender: this.config.partyId,
      receiver: targetParty,
      data,
      nonce: randomBytes(16).toString('hex'),
      mac: ''
    };

    // Add MAC for message authentication
    message.mac = this.generateMAC(message);

    try {
      connection.send(JSON.stringify(message));
    } catch (error) {
      throw new MPCError(
        MPCErrorType.NETWORK_ERROR,
        `Failed to send message to party ${targetParty}`,
        error
      );
    }
  }

  /**
   * Broadcast a message to all parties
   */
  public async broadcast(type: MessageType, data: any): Promise<void> {
    const promises = Array.from(this.connections.keys()).map(partyId =>
      this.sendMessage(partyId, type, data)
    );

    try {
      await Promise.all(promises);
    } catch (error) {
      throw new MPCError(
        MPCErrorType.NETWORK_ERROR,
        'Failed to broadcast message',
        error
      );
    }
  }

  /**
   * Clean up network resources
   */
  public destroy(): void {
    // Clear heartbeat timers
    this.heartbeatTimers.forEach(timer => clearInterval(timer));
    this.heartbeatTimers.clear();

    // Close all connections
    this.connections.forEach(connection => connection.close());
    this.connections.clear();

    // Close server
    if (this.server) {
      this.server.close();
    }
  }

  private setupServer(): void {
    if (!this.server) return;

    this.server.on('connection', (socket, request) => {
      const clientId = this.parseClientId(request);
      if (clientId === undefined) {
        socket.close();
        return;
      }

      this.handleConnection(clientId, socket);
    });

    this.server.on('error', (error) => {
      this.emit('error', new MPCError(
        MPCErrorType.NETWORK_ERROR,
        'WebSocket server error',
        error
      ));
    });
  }

  private async connectToParties(): Promise<void> {
    const connectPromises = Array.from(this.config.parties.entries())
      .filter(([id]) => id !== this.config.partyId)
      .map(([id, party]) => this.connectToParty(id, party));

    await Promise.all(connectPromises);
  }

  private async connectToParty(id: number, party: MPCParty): Promise<void> {
    const url = `ws://${party.host}:${party.port}?clientId=${this.config.partyId}`;

    try {
      const socket = new WebSocket(url);
      this.handleConnection(id, socket);

      return new Promise((resolve, reject) => {
        socket.on('open', resolve);
        socket.on('error', reject);
      });
    } catch (error) {
      throw new MPCError(
        MPCErrorType.NETWORK_ERROR,
        `Failed to connect to party ${id}`,
        error
      );
    }
  }

  private handleConnection(partyId: number, socket: WebSocket): void {
    this.connections.set(partyId, socket);

    socket.on('message', (data: WebSocket.Data) => {
      try {
        const message: Message = JSON.parse(data.toString());
        
        // Verify message MAC
        const expectedMAC = this.generateMAC(message);
        if (message.mac !== expectedMAC) {
          throw new Error('Invalid message MAC');
        }

        this.emit('message', message);
      } catch (error) {
        this.emit('error', new MPCError(
          MPCErrorType.NETWORK_ERROR,
          'Failed to process message',
          error
        ));
      }
    });

    socket.on('close', () => {
      this.connections.delete(partyId);
      this.emit('partyDisconnected', partyId);

      // Attempt reconnection after delay
      setTimeout(() => {
        const party = this.config.parties.get(partyId);
        if (party) {
          this.connectToParty(partyId, party).catch(error => {
            this.emit('error', new MPCError(
              MPCErrorType.NETWORK_ERROR,
              `Failed to reconnect to party ${partyId}`,
              error
            ));
          });
        }
      }, this.retryDelay);
    });

    socket.on('error', (error) => {
      this.emit('error', new MPCError(
        MPCErrorType.NETWORK_ERROR,
        `WebSocket error with party ${partyId}`,
        error
      ));
    });

    this.emit('partyConnected', partyId);
  }

  private parseClientId(request: any): number | undefined {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const clientId = url.searchParams.get('clientId');
    return clientId ? parseInt(clientId, 10) : undefined;
  }

  private generateMAC(message: Message): string {
    const { mac, ...messageWithoutMAC } = message;
    const data = JSON.stringify(messageWithoutMAC);
    return createHash('sha256')
      .update(Buffer.concat([Buffer.from(data), this.sessionKey]))
      .digest('hex');
  }

  private startHeartbeat(): void {
    this.connections.forEach((_, partyId) => {
      const timer = setInterval(async () => {
        try {
          await this.sendMessage(partyId, MessageType.HEARTBEAT, {
            timestamp: Date.now()
          });
        } catch (error) {
          this.emit('error', new MPCError(
            MPCErrorType.NETWORK_ERROR,
            `Failed to send heartbeat to party ${partyId}`,
            error
          ));
        }
      }, this.heartbeatInterval);

      this.heartbeatTimers.set(partyId, timer);
    });
  }
} 