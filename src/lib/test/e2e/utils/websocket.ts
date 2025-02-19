import { expect } from '@playwright/test';
import WebSocket from 'ws';
import { Logger } from '@/lib/logger';

const logger = new Logger('websocket-test-utils');

interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

interface WebSocketOptions {
  autoReconnect?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  onOpen?: () => void;
}

/**
 * WebSocket testing utilities
 */
export class WebSocketTestUtils {
  private static instance: WebSocketTestUtils;
  private connections: Map<string, WebSocket> = new Map();
  private messageQueues: Map<string, WebSocketMessage[]> = new Map();
  private options: Map<string, WebSocketOptions> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): WebSocketTestUtils {
    if (!WebSocketTestUtils.instance) {
      WebSocketTestUtils.instance = new WebSocketTestUtils();
    }
    return WebSocketTestUtils.instance;
  }

  /**
   * Create a new WebSocket connection
   */
  async createConnection(
    url: string,
    clientId: string,
    options: WebSocketOptions = {}
  ): Promise<WebSocket> {
    try {
      const ws = new WebSocket(url);
      this.connections.set(clientId, ws);
      this.messageQueues.set(clientId, []);
      this.options.set(clientId, options);

      ws.on('open', () => {
        logger.info('WebSocket connected', { clientId });
        options.onOpen?.();
      });

      ws.on('message', (data: string) => {
        try {
          const message: WebSocketMessage = JSON.parse(data);
          this.messageQueues.get(clientId)?.push(message);
          options.onMessage?.(message);
        } catch (error) {
          logger.error('Error parsing message', error as Error);
        }
      });

      ws.on('error', (error: Error) => {
        logger.error('WebSocket error', error);
        options.onError?.(error);
      });

      ws.on('close', () => {
        logger.info('WebSocket closed', { clientId });
        options.onClose?.();

        if (options.autoReconnect) {
          this.handleReconnection(url, clientId, options);
        }
      });

      return ws;
    } catch (error) {
      logger.error('Error creating WebSocket connection', error as Error);
      throw error;
    }
  }

  /**
   * Send a message through WebSocket
   */
  async sendMessage(clientId: string, type: string, payload: any): Promise<void> {
    const ws = this.connections.get(clientId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: Date.now(),
    };

    ws.send(JSON.stringify(message));
  }

  /**
   * Wait for a specific message type
   */
  async waitForMessage(
    clientId: string,
    type: string,
    timeout = 5000
  ): Promise<WebSocketMessage> {
    const startTime = Date.now();
    const queue = this.messageQueues.get(clientId);

    while (Date.now() - startTime < timeout) {
      const message = queue?.find(m => m.type === type);
      if (message) {
        queue?.splice(queue.indexOf(message), 1);
        return message;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Timeout waiting for message type: ${type}`);
  }

  /**
   * Verify message delivery
   */
  async verifyMessageDelivery(
    clientId: string,
    type: string,
    payload: any,
    timeout = 5000
  ): Promise<void> {
    const message = await this.waitForMessage(clientId, type, timeout);
    expect(message.payload).toEqual(payload);
  }

  /**
   * Close WebSocket connection
   */
  async closeConnection(clientId: string): Promise<void> {
    const ws = this.connections.get(clientId);
    if (ws) {
      ws.close();
      this.connections.delete(clientId);
      this.messageQueues.delete(clientId);
      this.options.delete(clientId);
    }
  }

  /**
   * Close all connections
   */
  async closeAllConnections(): Promise<void> {
    for (const clientId of this.connections.keys()) {
      await this.closeConnection(clientId);
    }
  }

  /**
   * Handle WebSocket reconnection
   */
  private async handleReconnection(
    url: string,
    clientId: string,
    options: WebSocketOptions
  ): Promise<void> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
    } = options;

    let retries = 0;
    const tryReconnect = async () => {
      try {
        if (retries >= maxRetries) {
          logger.error('Max reconnection attempts reached', { clientId });
          return;
        }

        retries++;
        logger.info('Attempting reconnection', { clientId, attempt: retries });
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        await this.createConnection(url, clientId, options);
      } catch (error) {
        logger.error('Reconnection failed', error as Error);
        await tryReconnect();
      }
    };

    await tryReconnect();
  }

  /**
   * Simulate connection drop
   */
  async simulateConnectionDrop(clientId: string): Promise<void> {
    const ws = this.connections.get(clientId);
    if (ws) {
      // Force close the connection
      ws.terminate();
    }
  }

  /**
   * Clear message queue
   */
  clearMessageQueue(clientId: string): void {
    this.messageQueues.set(clientId, []);
  }

  /**
   * Get connection status
   */
  isConnected(clientId: string): boolean {
    const ws = this.connections.get(clientId);
    return ws?.readyState === WebSocket.OPEN;
  }
}

/**
 * Get WebSocket testing utilities instance
 */
export function getWebSocketUtils(): WebSocketTestUtils {
  return WebSocketTestUtils.getInstance();
} 