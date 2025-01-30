export interface AuditLog {
    id: string; // Use string for Supabase IDs
    eventType: string;
    userId?: string;
    sessionId?: string;
    resourceType: string;
    resourceId: string;
    action: string;
    status: 'success' | 'failure';
    details?: any; // Use 'any' for mixed types
    metadata?: any; // Use 'any' for mixed types
    createdAt: Date; // Timestamps will be managed by Supabase
}
