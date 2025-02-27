import { EventEmitter } from 'events';
import { singleton } from 'tsyringe';

interface WebSocketMessage {
  type: string;
  payload: any;
}

@singleton()
export class WebSocketService extends EventEmitter {
  private static instance: WebSocketService;
  private connections: Map<string, WebSocket> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 1000; // 1 second

  private constructor() {
    super();
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public async connect(channelId: string, url: string): Promise<void> {
    if (this.connections.has(channelId)) {
      console.warn(`WebSocket connection already exists for channel ${channelId}`);
      return;
    }

    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log(`WebSocket connected for channel ${channelId}`);
        this.emit('connected', channelId);
        this.reconnectAttempts.set(channelId, 0);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.emit('message', channelId, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error for channel ${channelId}:`, error);
        this.emit('error', channelId, error);
      };

      ws.onclose = () => {
        console.log(`WebSocket closed for channel ${channelId}`);
        this.emit('disconnected', channelId);
        this.connections.delete(channelId);
        this.handleReconnect(channelId, url);
      };

      this.connections.set(channelId, ws);
    } catch (error) {
      console.error(`Error establishing WebSocket connection for channel ${channelId}:`, error);
      throw error;
    }
  }

  public async disconnect(channelId: string): Promise<void> {
    const connection = this.connections.get(channelId);
    if (connection) {
      connection.close();
      this.connections.delete(channelId);
      this.reconnectAttempts.delete(channelId);
    }
  }

  public async send(channelId: string, message: WebSocketMessage): Promise<void> {
    const connection = this.connections.get(channelId);
    if (!connection) {
      throw new Error(`No WebSocket connection found for channel ${channelId}`);
    }

    if (connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify(message));
    } else {
      throw new Error(`WebSocket not ready for channel ${channelId}`);
    }
  }

  public isConnected(channelId: string): boolean {
    const connection = this.connections.get(channelId);
    return connection?.readyState === WebSocket.OPEN;
  }

  private async handleReconnect(channelId: string, url: string): Promise<void> {
    const attempts = this.reconnectAttempts.get(channelId) || 0;
    
    if (attempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts.set(channelId, attempts + 1);
      
      setTimeout(async () => {
        console.log(`Attempting to reconnect channel ${channelId}, attempt ${attempts + 1}`);
        try {
          await this.connect(channelId, url);
        } catch (error) {
          console.error(`Reconnection attempt failed for channel ${channelId}:`, error);
        }
      }, this.RECONNECT_DELAY * Math.pow(2, attempts));
    } else {
      console.error(`Max reconnection attempts reached for channel ${channelId}`);
      this.emit('max_reconnect_attempts', channelId);
    }
  }

  public cleanup(): void {
    for (const [channelId, connection] of this.connections) {
      connection.close();
      this.connections.delete(channelId);
      this.reconnectAttempts.delete(channelId);
    }
  }
} 