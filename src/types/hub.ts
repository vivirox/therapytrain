export interface Hub {
  climate: Record<"low" | "high", number>;
  lights: Array<{ name: string; status: boolean }>;
  locks: Array<{ name: string; isLocked: boolean }>;
}

export interface HubConnection {
  id: string;
  status: 'connected' | 'disconnected' | 'error';
  lastConnected: Date;
  hub: Hub;
}

export interface HubMessage {
  type: 'status' | 'command' | 'event';
  payload: any;
  timestamp: Date;
  hubId: string;
}
