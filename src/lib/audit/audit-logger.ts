import { kv } from '@vercel/kv';
import { cache } from 'react';

const AUDIT_LOG_PREFIX = 'audit:logs:';
const AUDIT_INDEX_PREFIX = 'audit:index:';

export enum AuditEventType {
  MESSAGE_ENCRYPTED = 'MESSAGE_ENCRYPTED',
  MESSAGE_DECRYPTED = 'MESSAGE_DECRYPTED',
  KEY_GENERATED = 'KEY_GENERATED',
  KEY_ROTATED = 'KEY_ROTATED',
  MESSAGE_ACCESSED = 'MESSAGE_ACCESSED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
}

interface AuditEvent {
  id: string;
  type: AuditEventType;
  userId: string;
  timestamp: string;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditLogOptions {
  includeIp?: boolean;
  includeUserAgent?: boolean;
}

// Create a new audit event
export async function createAuditEvent(
  type: AuditEventType,
  userId: string,
  metadata: Record<string, any>,
  options: AuditLogOptions = {}
): Promise<AuditEvent> {
  const event: AuditEvent = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    userId,
    timestamp: new Date().toISOString(),
    metadata,
  };

  if (options.includeIp) {
    event.ipAddress = metadata.ipAddress;
  }

  if (options.includeUserAgent) {
    event.userAgent = metadata.userAgent;
  }

  // Store the event
  await storeAuditEvent(event);

  // Index the event for faster querying
  await indexAuditEvent(event);

  return event;
}

// Store audit event in KV store
async function storeAuditEvent(event: AuditEvent): Promise<void> {
  const key = `${AUDIT_LOG_PREFIX}${event.id}`;
  await kv.set(key, event);
}

// Index audit event for querying
async function indexAuditEvent(event: AuditEvent): Promise<void> {
  // Index by user
  const userKey = `${AUDIT_INDEX_PREFIX}user:${event.userId}`;
  await kv.lpush(userKey, event.id);

  // Index by type
  const typeKey = `${AUDIT_INDEX_PREFIX}type:${event.type}`;
  await kv.lpush(typeKey, event.id);

  // Index by date (YYYY-MM-DD)
  const date = event.timestamp.split('T')[0];
  const dateKey = `${AUDIT_INDEX_PREFIX}date:${date}`;
  await kv.lpush(dateKey, event.id);
}

// Get audit events by user
export const getAuditEventsByUser = cache(async (
  userId: string,
  limit: number = 100,
  offset: number = 0
): Promise<AuditEvent[]> => {
  const userKey = `${AUDIT_INDEX_PREFIX}user:${userId}`;
  const eventIds = await kv.lrange(userKey, offset, offset + limit - 1);
  
  return await getAuditEventsByIds(eventIds);
});

// Get audit events by type
export const getAuditEventsByType = cache(async (
  type: AuditEventType,
  limit: number = 100,
  offset: number = 0
): Promise<AuditEvent[]> => {
  const typeKey = `${AUDIT_INDEX_PREFIX}type:${type}`;
  const eventIds = await kv.lrange(typeKey, offset, offset + limit - 1);
  
  return await getAuditEventsByIds(eventIds);
});

// Get audit events by date range
export const getAuditEventsByDateRange = cache(async (
  startDate: string,
  endDate: string,
  limit: number = 100,
  offset: number = 0
): Promise<AuditEvent[]> => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const events: AuditEvent[] = [];

  for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toISOString().split('T')[0];
    const dateKey = `${AUDIT_INDEX_PREFIX}date:${dateStr}`;
    const eventIds = await kv.lrange(dateKey, 0, -1);
    const dateEvents = await getAuditEventsByIds(eventIds);
    events.push(...dateEvents);
  }

  return events.slice(offset, offset + limit);
});

// Helper to get audit events by IDs
async function getAuditEventsByIds(eventIds: string[]): Promise<AuditEvent[]> {
  const events: AuditEvent[] = [];

  for (const id of eventIds) {
    const key = `${AUDIT_LOG_PREFIX}${id}`;
    const event = await kv.get<AuditEvent>(key);
    if (event) {
      events.push(event);
    }
  }

  return events;
}

// Create audit event for message encryption
export async function logMessageEncryption(
  userId: string,
  messageId: string,
  recipientId: string
): Promise<void> {
  await createAuditEvent(
    AuditEventType.MESSAGE_ENCRYPTED,
    userId,
    {
      messageId,
      recipientId,
    }
  );
}

// Create audit event for message decryption
export async function logMessageDecryption(
  userId: string,
  messageId: string
): Promise<void> {
  await createAuditEvent(
    AuditEventType.MESSAGE_DECRYPTED,
    userId,
    {
      messageId,
    }
  );
}

// Create audit event for key generation
export async function logKeyGeneration(
  userId: string,
  keyVersion: number
): Promise<void> {
  await createAuditEvent(
    AuditEventType.KEY_GENERATED,
    userId,
    {
      keyVersion,
    }
  );
}

// Create audit event for key rotation
export async function logKeyRotation(
  userId: string,
  oldVersion: number,
  newVersion: number
): Promise<void> {
  await createAuditEvent(
    AuditEventType.KEY_ROTATED,
    userId,
    {
      oldVersion,
      newVersion,
    }
  );
}

// Create audit event for message access
export async function logMessageAccess(
  userId: string,
  messageId: string,
  success: boolean,
  metadata: Record<string, any> = {}
): Promise<void> {
  await createAuditEvent(
    success ? AuditEventType.MESSAGE_ACCESSED : AuditEventType.UNAUTHORIZED_ACCESS,
    userId,
    {
      messageId,
      success,
      ...metadata,
    },
    { includeIp: true, includeUserAgent: true }
  );
} 