import WebSocket from 'ws';
import { Server } from 'http';
import { verify } from 'jsonwebtoken';
import { supabase } from '../../../config/database';

interface SessionClient {
  id: string;
  ws: WebSocket;
  sessionId: string;
  lastHeartbeat: number;
}

interface Message {
  type: 'text' | 'system' | 'ai' | 'action' | 'heartbeat';
  content: string;
  metadata?: {
    sentiment?: number;
    topics?: string[];
    suggestions?: string[];
  };
  timestamp: string;
}

export class WebSocketServer {
  private wss: WebSocket.Server;
  private clients: Map<string, SessionClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout;

  constructor(server: Server) {
    this.wss = new WebSocket.Server({ server });
    this.setupWebSocketServer();
    this.startHeartbeatCheck();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', async (ws: WebSocket, request) => {
      try {
        // Extract and verify JWT token
        const token = this.extractToken(request);
        if (!token) {
          ws.close(4001, 'Authentication required');
          return;
        }

        const user = await this.verifyToken(token);
        if (!user) {
          ws.close(4002, 'Invalid token');
          return;
        }

        // Extract session ID from query parameters
        const sessionId = this.extractSessionId(request);
        if (!sessionId) {
          ws.close(4003, 'Session ID required');
          return;
        }

        // Verify session exists and user has access
        const hasAccess = await this.verifySessionAccess(sessionId, user.id);
        if (!hasAccess) {
          ws.close(4004, 'Session access denied');
          return;
        }

        // Setup client
        const client: SessionClient = {
          id: user.id,
          ws,
          sessionId,
          lastHeartbeat: Date.now()
        };

        this.clients.set(user.id, client);
        
        // Send welcome message
        this.sendMessage(ws, {
          type: 'system',
          content: 'Connected to session',
          timestamp: new Date().toISOString()
        });

        // Setup message handler
        ws.on('message', async (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString()) as Message;
            await this.handleMessage(client, message);
          } catch (error) {
            console.error('Error handling message:', error);
            this.sendError(ws, 'Invalid message format');
          }
        });

        // Setup close handler
        ws.on('close', () => {
          this.clients.delete(user.id);
          this.handleDisconnect(client);
        });

        // Setup error handler
        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.handleError(client, error);
        });

      } catch (error) {
        console.error('Connection error:', error);
        ws.close(4000, 'Connection error');
      }
    });
  }

  private startHeartbeatCheck() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      this.clients.forEach((client, userId) => {
        if (now - client.lastHeartbeat > 30000) { // 30 seconds timeout
          console.warn(`Client ${userId} heartbeat timeout`);
          client.ws.close(4008, 'Heartbeat timeout');
          this.clients.delete(userId);
        }
      });
    }, 10000); // Check every 10 seconds
  }

  private async handleMessage(client: SessionClient, message: Message) {
    // Update heartbeat timestamp
    if (message.type === 'heartbeat') {
      client.lastHeartbeat = Date.now();
      this.sendMessage(client.ws, {
        type: 'heartbeat',
        content: 'pong',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Persist message
    try {
      await this.persistMessage(client.sessionId, client.id, message);
    } catch (error) {
      console.error('Error persisting message:', error);
      this.sendError(client.ws, 'Failed to persist message');
      return;
    }

    // Broadcast message to all clients in the session
    this.broadcastToSession(client.sessionId, message);
  }

  private async persistMessage(sessionId: string, userId: string, message: Message) {
    const { error } = await supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        content: message.content,
        type: message.type,
        metadata: message.metadata
      });

    if (error) throw error;
  }

  private broadcastToSession(sessionId: string, message: Message) {
    this.clients.forEach((client) => {
      if (client.sessionId === sessionId) {
        this.sendMessage(client.ws, message);
      }
    });
  }

  private sendMessage(ws: WebSocket, message: Message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, message: string) {
    this.sendMessage(ws, {
      type: 'system',
      content: message,
      timestamp: new Date().toISOString()
    });
  }

  private async handleDisconnect(client: SessionClient) {
    // Update session status if needed
    try {
      await supabase
        .from('sessions')
        .update({ status: 'disconnected' })
        .eq('id', client.sessionId)
        .eq('user_id', client.id);
    } catch (error) {
      console.error('Error updating session status:', error);
    }
  }

  private handleError(client: SessionClient, error: Error) {
    console.error(`WebSocket error for client ${client.id}:`, error);
    // Implement error reporting/monitoring here
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers['authorization'];
    if (!authHeader) return null;
    
    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) return null;
    
    return token;
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  private extractSessionId(request: any): string | null {
    const url = new URL(request.url, 'http://localhost');
    return url.searchParams.get('sessionId');
  }

  private async verifySessionAccess(sessionId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Session access verification error:', error);
      return false;
    }
  }

  public shutdown() {
    clearInterval(this.heartbeatInterval);
    this.wss.close();
  }
}
