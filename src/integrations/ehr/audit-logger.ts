import { AuditLogEntry } from './types';

// In a production environment, this would be replaced with a proper database implementation
let auditLogs: AuditLogEntry[] = [];

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    // Validate required fields
    if (!entry.timestamp || !entry.actor || !entry.action || !entry.resource) {
      throw new Error('Missing required audit log fields');
    }

    // Add IP address and user agent in production environment
    if (typeof window !== 'undefined') {
      entry.userAgent = window.navigator.userAgent;
      // IP address would be captured server-side
    }

    // In production, this would write to a secure, HIPAA-compliant storage system
    auditLogs.push(entry);

    // Log to console in development environment
    if (process.env.NODE_ENV === 'development') {
      console.log('Audit Log Entry:', entry);
    }
  } catch (error) {
    console.error('Failed to create audit log:', error);
    throw error;
  }
}

export async function queryAuditLogs(params: {
  startDate?: string;
  endDate?: string;
  actorId?: string;
  resourceType?: string;
  action?: string;
  status?: 'success' | 'failure';
}): Promise<AuditLogEntry[]> {
  try {
    let filteredLogs = [...auditLogs];

    if (params.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= params.startDate!);
    }

    if (params.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= params.endDate!);
    }

    if (params.actorId) {
      filteredLogs = filteredLogs.filter(log => log.actor.id === params.actorId);
    }

    if (params.resourceType) {
      filteredLogs = filteredLogs.filter(log => log.resource.type === params.resourceType);
    }

    if (params.action) {
      filteredLogs = filteredLogs.filter(log => log.action === params.action);
    }

    if (params.status) {
      filteredLogs = filteredLogs.filter(log => log.status === params.status);
    }

    return filteredLogs;
  } catch (error) {
    console.error('Failed to query audit logs:', error);
    throw error;
  }
}

export async function getAuditLogById(id: string): Promise<AuditLogEntry | null> {
  try {
    const log = auditLogs.find(log => log.actor.id === id);
    return log || null;
  } catch (error) {
    console.error('Failed to get audit log by ID:', error);
    throw error;
  }
}

export async function clearAuditLogs(): Promise<void> {
  try {
    // In production, this would be a soft delete or archive operation
    auditLogs = [];
  } catch (error) {
    console.error('Failed to clear audit logs:', error);
    throw error;
  }
}

// Export for testing purposes only
export function _getAuditLogs(): AuditLogEntry[] {
  return auditLogs;
} 