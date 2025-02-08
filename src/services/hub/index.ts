export interface HubConnection {
  id: string;
  userId: string;
  status: 'connected' | 'disconnected' | 'error';
  lastActivity: Date;
  metadata?: Record<string, unknown>;
}

export interface HubMessage {
  id: string;
  type: 'event' | 'command' | 'notification' | 'response';
  payload: unknown;
  timestamp: Date;
  sender: string;
  recipient?: string;
  metadata?: Record<string, unknown>;
}

export interface HubEvent {
  type: string;
  data: unknown;
  timestamp: Date;
  source: string;
}

export interface HubService {
  connect(userId: string): Promise<HubConnection>;
  disconnect(connectionId: string): Promise<void>;
  send(message: HubMessage): Promise<void>;
  subscribe(eventType: string, callback: (event: HubEvent) => void): () => void;
  getConnections(): Promise<HubConnection[]>;
  getConnectionStatus(connectionId: string): Promise<HubConnection['status']>;
}

export interface HubConfig {
  reconnectAttempts: number;
  reconnectInterval: number;
  heartbeatInterval: number;
  messageTimeout: number;
}

export * from '@/services/websocket/sessionmanager';
export * from '@/services/websocket/websocketserver'; 