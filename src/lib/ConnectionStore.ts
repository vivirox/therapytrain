interface Connection {
  userId: string;
  threadId: string;
  clientId: string;
  lastActive: number;
  controller: ReadableStreamDefaultController;
}

export class ConnectionStore {
  private connections: Map<string, Connection> = new Map();

  async addConnection(connection: Connection): Promise<void> {
    this.connections.set(connection.clientId, connection);
  }

  async removeConnection(clientId: string): Promise<void> {
    this.connections.delete(clientId);
  }

  async sendEvent(clientId: string, event: any): Promise<void> {
    const connection = this.connections.get(clientId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
    connection.controller.enqueue(data);
    connection.lastActive = Date.now();
  }

  async getConnection(clientId: string): Promise<Connection | undefined> {
    return this.connections.get(clientId);
  }

  async getConnectionsByUserId(userId: string): Promise<Connection[]> {
    return Array.from(this.connections.values())
      .filter(conn => conn.userId === userId);
  }

  async getConnectionsByThreadId(threadId: string): Promise<Connection[]> {
    return Array.from(this.connections.values())
      .filter(conn => conn.threadId === threadId);
  }
} 