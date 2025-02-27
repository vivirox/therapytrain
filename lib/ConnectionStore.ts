/**
 * Connection store for managing SSE client connections
 */
interface Connection {
  userId: string;
  threadId: string;
  clientId: string;
  lastActive: number;
  controller: ReadableStreamDefaultController;
}

export class ConnectionStore {
  private connections: Map<string, Connection> = new Map();
  
  /**
   * Add a new client connection
   */
  async addConnection(connection: Connection): Promise<void> {
    this.connections.set(connection.clientId, connection);
  }
  
  /**
   * Remove a client connection
   */
  async removeConnection(clientId: string): Promise<void> {
    this.connections.delete(clientId);
  }
  
  /**
   * Send event to a specific client
   */
  async sendEvent(clientId: string, event: any): Promise<void> {
    const connection = this.connections.get(clientId);
    if (!connection) {
      throw new Error(`Connection not found for client ${clientId}`);
    }
    
    const encoder = new TextEncoder();
    const data = encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
    connection.controller.enqueue(data);
    
    // Update last active timestamp
    connection.lastActive = Date.now();
  }
  
  /**
   * Get all connections for a user
   */
  getConnectionsByUserId(userId: string): Connection[] {
    return Array.from(this.connections.values())
      .filter(conn => conn.userId === userId);
  }
  
  /**
   * Get all connections for a thread
   */
  getConnectionsByThreadId(threadId: string): Connection[] {
    return Array.from(this.connections.values())
      .filter(conn => conn.threadId === threadId);
  }
  
  /**
   * Get the total number of active connections
   */
  getConnectionCount(): number {
    return this.connections.size;
  }
}